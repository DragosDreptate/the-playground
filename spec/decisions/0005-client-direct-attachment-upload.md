# ADR-0005 — Upload des pièces jointes d'événement en client-direct (Vercel Blob)

- **Date** : 2026-06-19
- **Statut** : Accepté
- **Références** : `spec/features/moment-video-attachments.md` ; [doc Vercel — limite 4,5 Mo](https://vercel.com/docs/functions/runtimes#request-body-size)

## Contexte

Besoin produit : autoriser les **vidéos** (MP4, MOV, WebM) jusqu'à **30 Mo** en pièce jointe d'un événement, en plus des documents/images (PDF/JPG/PNG/WEBP, 10 Mo).

L'upload existant passait par une **Server Action** : le fichier transitait dans le body de la fonction, puis `put()` l'écrivait sur Blob côté serveur. Or Vercel plafonne le body des fonctions à **4,5 Mo** (limite plateforme, non contournable par `bodySizeLimit` de Next.js, qui n'est qu'applicatif). Conséquences :

- Le « Max 10 Mo » annoncé était **déjà cassé en production** au-delà de ~4,5 Mo (413), masqué en local car le plafond ne s'y applique pas.
- Supporter 30 Mo par ce chemin est **impossible**.

## Décision

Migrer **tout** l'upload des pièces jointes vers l'**upload client-direct Vercel Blob** : le fichier va du navigateur directement vers Blob (`upload()` de `@vercel/blob/client`), via une route `/api/moments/attachments/upload` (`handleUpload`) qui signe un token court.

Choix assumés :

- **Tout client-direct** (et non un hybride vidéo/non-vidéo) : un seul chemin d'upload à maintenir, et ça répare au passage le « 10 Mo » cassé. L'hybride aurait préservé le sniffing/atomicité sur le flux documents mais au prix de deux systèmes et d'un plafond de 4 Mo assumé sur les documents.
- **Renoncement au sniffing MIME serveur** (`fileTypeFromBuffer`) : en client-direct le serveur ne voit plus les octets. On se fie à `allowedContentTypes` du token (type déclaré). Risque résiduel jugé faible : upload réservé aux **HOST authentifiés** + rate-limité, liste de types **sans SVG**, content-type forcé à l'affichage.
- **Limite différenciée** par type, via `maxSizeForContentType` : vidéos 30 Mo, reste 10 Mo. Appliquée à 3 niveaux (validation client, `maximumSizeInBytes` du token, revalidation à la confirmation).
- **Persistance DB via une action de confirmation** (`confirmMomentAttachmentAction`) appelée par le client après l'upload, **pas** via `onUploadCompleted` (ce webhook n'atteint pas `localhost` → ingérable en dev). L'action **supprime le blob** si la validation échoue (anti-orphelin).
- Autorisation centralisée dans le usecase pur `authorizeMomentAttachmentUpload` (HOST + type + limite de 3), appelé par `onBeforeGenerateToken`.

## Alternatives écartées

- **Garder la Server Action** — impossible au-delà de 4,5 Mo, donc inutilisable pour la vidéo.
- **Hybride** (vidéos en client-direct, documents en Server Action) — écarté : préserve sniffing + atomicité sur les documents, mais impose **deux chemins** d'upload à vie, **laisse les documents plafonnés à ~4 Mo** (régression d'affichage), et n'économise presque rien puisque l'appareillage client-direct doit de toute façon être construit pour la vidéo.
- **Re-sniffing MIME post-upload** (fetch Range des premiers octets après upload) — écarté pour le MVP : sécurité équivalente mais round-trip + complexité supplémentaires, jugés non justifiés vu le périmètre (HOST authentifié, pas de SVG).

## Conséquences

- **Positives** : plus de plafond 4,5 Mo (vidéos 30 Mo possibles) ; **répare le 10 Mo cassé** ; un seul chemin d'upload ; uploads plus rapides (un seul saut réseau) et moins de charge fonction ; **vraie barre de progression** (`onUploadProgress`).
- **Limites assumées** :
  - **Pas de sniffing MIME serveur** : un HOST pourrait téléverser un fichier au type déclaré falsifié (risque borné, voir ci-dessus).
  - **Découplage Blob/DB** : un upload réussi sans confirmation (crash, onglet fermé) laisse un **blob orphelin**. Le rejet de validation est couvert (delete explicite) ; le cas crash est accepté pour le MVP, avec une note pour un cron de nettoyage ultérieur.
- **Dette connexe (hors périmètre)** : la **cover image** (10 Mo) et l'**avatar** (5 Mo) utilisent encore le pattern Server Action et ont donc le **même bug latent** au-delà de 4,5 Mo. À traiter séparément.
