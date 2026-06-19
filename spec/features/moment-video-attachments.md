# Pièces jointes vidéo + migration upload client-direct

## Objectif

Autoriser l'ajout de **vidéos** (MP4, MOV, WebM) jusqu'à **30 Mo** aux pièces jointes d'un événement (Moment), en plus des documents/images existants (PDF/JPG/PNG/WEBP, 10 Mo).

## Contrainte structurante : la limite 4,5 Mo de Vercel

L'upload actuel passe par une **Server Action** : le fichier transite dans le body de la fonction, puis `put()` l'envoie sur Blob côté serveur. Or Vercel plafonne le body des fonctions à **4,5 Mo** ([doc](https://vercel.com/docs/functions/runtimes#request-body-size)). Le `bodySizeLimit: "12mb"` de `next.config.ts` est une limite applicative Next.js qui **ne peut pas dépasser** ce plafond plateforme.

Conséquences :
- Le « Max 10 Mo » actuel est **déjà partiellement cassé en production** (tout fichier > ~4,5 Mo échoue en 413 ; ça « marche » en local car le plafond ne s'y applique pas).
- Supporter 30 Mo est **impossible** par le chemin actuel.

→ **Décision : migration vers l'upload client-direct Vercel Blob** (le fichier va du navigateur directement vers Blob, sans transiter par la fonction). Voir ADR `spec/decisions/`.

## Décisions actées

- **Tout client-direct** (un seul chemin d'upload, répare aussi le 10 Mo cassé).
- **Sans sniffing MIME serveur** : on renonce au `fileTypeFromBuffer` (anti-spoofing), on se fie à `allowedContentTypes` du token. Risque résiduel faible (upload réservé aux HOST authentifiés + rate-limités, liste de types sans SVG, content-type forcé à l'affichage).
- **Limite différenciée** : vidéos 30 Mo, docs/images 10 Mo.
- **Formats vidéo** : `video/mp4` + `video/quicktime` (MOV, format natif iPhone) + `video/webm`.

## Architecture cible

1. **Client** : `upload(pathname, file, { access:'public', handleUploadUrl:'/api/moments/attachments/upload', clientPayload, onUploadProgress })`.
2. **Route token** (`handleUpload` → `onBeforeGenerateToken`) : auth + vérif HOST + rate-limit + `allowedContentTypes` + `maximumSizeInBytes` selon le type déclaré.
3. **Confirmation DB** : après upload, le client appelle `confirmMomentAttachmentAction(...)` qui revalide droits/limites et crée la row. On évite `onUploadCompleted` (inopérant en localhost).

## Plan d'implémentation

### Phase 1 — Domaine & constantes
- `domain/models/moment-attachment.ts` : ajouter les 3 types vidéo ; deux constantes `MAX_ATTACHMENT_SIZE_BYTES` (10 Mo) et `MAX_VIDEO_ATTACHMENT_SIZE_BYTES` (30 Mo) ; helpers `isVideoContentType(ct)` et `maxSizeForContentType(ct)`.
- `domain/usecases/add-moment-attachment.ts` : input sans buffer `{ momentId, userId, url, filename, contentType, sizeBytes }` ; ne fait plus `storage.upload` (blob déjà uploadé) ; valide HOST + type + taille (`maxSizeForContentType`) + `count < 3`, puis `repo.create`.

### Phase 2 — Route token + confirmation
- Nouveau `app/api/moments/attachments/upload/route.ts` (route **fixe**, momentId via `clientPayload`) : `onBeforeGenerateToken` fait auth, parse clientPayload `{ momentId, contentType, filename }`, vérifie HOST, rate-limit (`prismaRateLimiter`), `count < 3`, valide le préfixe `moment-attachments/${momentId}/`, retourne `allowedContentTypes`, `maximumSizeInBytes: maxSizeForContentType(contentType)`, `addRandomSuffix`.
- `app/actions/moment-attachments.ts` : remplacer `uploadMomentAttachmentAction` par `confirmMomentAttachmentAction({ momentId, url, filename, contentType, sizeBytes })` ; **rollback `storage.delete(url)` si validation échoue** ; reprendre `revalidatePath('/m/[slug]', 'page')`.

### Phase 3 — Composant éditeur
- `components/moments/moment-attachments-editor.tsx` : remplacer les appels server action par `upload()` + `onUploadProgress` ; **vraie barre de progression %** ; pathname `moment-attachments/${momentId}/${sanitizeFilename(name)}` ; validation client par type ; `accept` avec vidéos ; confirm après upload ; mode staged conservé (flush après création).

### Phase 4 — Rendu vidéo
- `components/moments/attachment-format.ts` : `isVideoAttachment()` + `formatAttachmentType` (MP4/MOV/WEBM).
- `components/moments/moment-attachments-list.tsx` : icône `Video`.
- `components/moments/attachment-viewer-dialog.tsx` : branche `<video controls>` (lecture depuis URL Blob ; bouton Télécharger garde la route proxy qui streame déjà).

### Phase 5 — i18n & doc
- `messages/fr.json` + `en.json` : `dropzoneHint`, `errorTypeNotAllowed`, `Help.organizer.attachments.intro`.

### Phase 6 — Tests
- `add-moment-attachment.test.ts` : refonte (input sans buffer), formats vidéo, limite différenciée.
- Nouveau test de la logique `onBeforeGenerateToken` (fonction pure extraite).
- `confirmMomentAttachmentAction` : permissions + rollback.
- E2E `moment-attachments.spec.ts` : flux client-direct + upload vidéo (BLOB token de test ou mock).

## Risques & hors-scope

- **Orphelins** : `storage.delete` au rejet de validation ; reste le cas « upload OK mais confirm jamais appelée » (crash/onglet) → accepté MVP, note pour un cron de nettoyage ultérieur.
- **Hors-scope** : cover image (10 Mo) et avatar (5 Mo) ont le **même bug latent** 4,5 Mo (même pattern server action). Ticket séparé.
- Pas de nouvelle dépendance (`@vercel/blob@2.3.3` expose `/client`). Pas de changement de schema Prisma.

## Configuration CSP requise (piège vérifié en test)

L'upload client-direct et la lecture vidéo nécessitent d'élargir la CSP (`next.config.ts`), sinon l'upload reste figé à 0 % et la vidéo ne se lit pas :

- `connect-src` : ajouter `vercel.com` (initiation `vercel.com/api/blob`), `blob.vercel-storage.com` et `*.public.blob.vercel-storage.com` (PUT vers le store).
- `media-src` : créer la directive (absente) avec `'self' *.public.blob.vercel-storage.com`, sinon `<video>` retombe sur `default-src 'self'` et la source Blob est bloquée.

> À reproduire si la dette cover/avatar est migrée vers le client-direct.
