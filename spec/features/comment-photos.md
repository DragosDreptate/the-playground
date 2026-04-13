# Photos dans les commentaires — Spec

> Permettre à tout inscrit de joindre jusqu'à 3 photos à un commentaire sur un événement. Les photos lourdes sont automatiquement redimensionnées côté client pour une friction zéro, y compris depuis un téléphone.

---

## Vision produit

Le fil de commentaires est aujourd'hui en texte pur. C'est suffisant pour les échanges simples, mais limitant pour les événements communautaires où les participants veulent :

- **Partager des photos de l'événement** (ambiance, groupe, lieu)
- **Poser une question visuelle** ("c'est bien ici ?" + photo de l'entrée)
- **Montrer un résultat** (atelier cuisine, hackathon, sport)
- **Remercier l'organisateur** avec une photo souvenir

Ces photos sont les meilleures preuves sociales possibles. Elles transforment un fil de commentaires en mémoire collective de l'événement, et donnent envie aux futurs participants de rejoindre la Communauté.

### Positionnement

- **Simple comme un message** : joindre une photo doit être aussi naturel que dans WhatsApp ou iMessage. Pas de formulaire d'upload, pas de galerie dédiée, juste un bouton photo à côté du textarea.
- **Mobile-first** : le parcours Participant passe par mobile (lien partagé via WhatsApp/Instagram). Les photos viennent de la galerie du téléphone, elles sont souvent lourdes (5 à 15 Mo sur un iPhone). Le redimensionnement automatique élimine cette friction.
- **Le texte reste central** : un commentaire nécessite toujours du texte. Les photos enrichissent le message, elles ne le remplacent pas.
- **Intégré, pas séparé** : les photos font partie du commentaire. Pas de galerie photos dédiée, pas d'album. La suppression d'un commentaire supprime ses photos.

---

## Règles produit

| Règle | Valeur |
| --- | --- |
| **Nombre maximum** | 3 photos par commentaire |
| **Texte obligatoire** | Oui (min 1 caractère après trim, max 2000 comme aujourd'hui) |
| **Types acceptés** | JPEG, PNG, WebP (images uniquement, pas de PDF) |
| **Redimensionnement automatique** | Côté client, si le fichier dépasse 3 Mo |
| **Taille maximum serveur** | 5 Mo par photo (filet de sécurité post-resize) |
| **Qui peut poster** | Tout utilisateur inscrit (identique aux commentaires texte) |
| **Qui peut supprimer** | L'auteur du commentaire ou un Organisateur (HOST) du Circle |
| **Granularité de suppression** | Le commentaire entier uniquement (pas de suppression photo individuelle) |
| **Ordre d'affichage** | Par date d'ajout du commentaire (inchangé) |
| **Visibilité** | Publique (même visibilité que les commentaires texte) |
| **Upload** | Atomique avec le commentaire (texte + photos envoyés ensemble) |

### Redimensionnement automatique côté client

La fonction `resizeImage()` existante (`src/lib/image-resize.ts`) est réutilisée mais doit être étendue pour supporter un mode **non carré** (les photos de commentaires ne sont pas des avatars ni des covers).

**Nouvelle fonction ****`compressCommentPhoto()`** :

| Paramètre | Valeur |
| --- | --- |
| **Déclencheur** | Le fichier source dépasse 3 Mo |
| **Si fichier ≤ 3 Mo** | Aucune transformation, envoi tel quel |
| **Dimension max** | 1920px (le côté le plus long est ramené à 1920px, ratio préservé) |
| **Qualité** | 0.8 (80%) |
| **Format de sortie** | WebP (fallback JPEG si non supporté) |
| **Crop** | Aucun (ratio d'origine conservé, contrairement aux covers) |
| **Résultat typique** | Photo iPhone 12 Mo → ~200-400 Ko en WebP 1920px |

La différence clé avec `resizeImage()` : pas de crop carré, ratio préservé, et déclenchement conditionnel (seulement si > 3 Mo). L'utilitaire existant fait un centre-crop carré adapté aux avatars/covers mais inadapté aux photos libres.

### Validation côté serveur

- Type MIME vérifié par magic bytes (`fileTypeFromBuffer` de `file-type`), pas le header déclaré
- Taille re-vérifiée après upload (max 5 Mo)
- Nombre total par commentaire vérifié (max 3)
- Même contrôle d'accès que pour poster un commentaire texte (authentifié + non PENDING_APPROVAL)

### Validation côté client

- Feedback immédiat sur type/taille avant envoi
- Redimensionnement transparent si > 3 Mo (pas de message d'erreur, juste une compression silencieuse)
- Messages d'erreur inline si type non supporté ou si > 5 Mo après compression

---

## UX — Formulaire de commentaire (saisie)

### État actuel

```
┌─────────────────────────────────────────────────┐
│ [textarea placeholder]                          │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│ 0 / 2000                          [Commenter]  │
└─────────────────────────────────────────────────┘
```

### Nouvel état avec bouton photo

```
┌─────────────────────────────────────────────────┐
│ [textarea placeholder]                          │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│ 📷  0 / 2000                      [Commenter]  │
└─────────────────────────────────────────────────┘
```

Le bouton photo (`ImagePlus` icon de Lucide, `size-5`, `text-muted-foreground hover:text-foreground`) est placé à gauche du compteur de caractères. Il déclenche un `<input type="file" accept="image/*" multiple>` caché.

### État avec photos sélectionnées (avant envoi)

```
┌─────────────────────────────────────────────────┐
│ Super soirée, merci pour l'organisation !       │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐                     │
│ │ img1 │ │ img2 │ │ img3 │   (miniatures)      │
│ │  [×]  │ │  [×]  │ │  [×]  │                     │
│ └──────┘ └──────┘ └──────┘                     │
├─────────────────────────────────────────────────┤
│ 📷  42 / 2000                     [Commenter]  │
└─────────────────────────────────────────────────┘
```

### Détails des miniatures (previews)

| Élément | Valeur |
| --- | --- |
| Taille miniature | `w-16 h-16` (64x64px) sur mobile, `w-20 h-20` (80x80px) sur desktop |
| Style | `rounded-lg object-cover` (les photos sont croppées visuellement en carré pour la preview, mais stockées en ratio original) |
| Bouton supprimer | Icône `X` en `absolute top-0 right-0`, `size-4`, cercle `bg-black/60 text-white hover:bg-black/80`, supprime la photo de la sélection (avant envoi) |
| Conteneur | `flex gap-2 px-3 py-2` entre le textarea et la barre d'action |
| Limite atteinte | Si 3 photos, le bouton photo (`ImagePlus`) passe en `opacity-50 cursor-not-allowed` et ne déclenche plus l'input file |
| Animation | Les miniatures apparaissent avec un léger `animate-in fade-in` |

### État pendant l'envoi

Le bouton "Commenter" est disabled et affiche le loader. Les miniatures restent visibles. Pas de progress bar individuelle par photo (l'envoi est atomique).

### Messages d'erreur inline

| Cas | Message |
| --- | --- |
| Type non supporté | "Format non supporté. JPG, PNG ou WebP uniquement." |
| Photo > 5 Mo après compression | "Photo trop volumineuse, même après compression." |
| Limite 3 photos atteinte | (pas de message, bouton grisé suffit) |
| Erreur réseau | "Erreur lors de l'envoi. Réessayez." |

### Accessibilité

- Le bouton photo a un `aria-label` : "Ajouter des photos" / "Add photos"
- Le bouton photo grisé a un `aria-disabled="true"`
- Les miniatures sont dans un `role="list"` avec `role="listitem"`
- Chaque bouton supprimer a un `aria-label` : "Retirer cette photo" / "Remove this photo"
- `accept="image/*"` sur l'input file (filtre natif du sélecteur de fichiers)

---

## UX — Affichage des photos dans un commentaire posté

### Commentaire avec photos

```
┌─ Avatar ─── Nom · il y a 5 min · Supprimer ────┐
│                                                  │
│  Super soirée, merci pour l'organisation !       │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │          │ │          │ │          │         │
│  │  photo1  │ │  photo2  │ │  photo3  │         │
│  │          │ │          │ │          │         │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Détails de l'affichage — plusieurs photos (2 ou 3)

Les vignettes sont **toujours carrées** (`object-cover` crop visuel), quelle que soit la forme de la photo originale. Cela garantit un alignement propre dans le fil de commentaires.

| Élément | Valeur |
| --- | --- |
| Position | Sous le texte du commentaire, avec `mt-2` |
| Conteneur | `flex gap-2 flex-wrap` |
| Taille | `w-24 h-24` (96x96px) mobile, `w-32 h-32` (128x128px) desktop |
| Style image | `rounded-lg object-cover cursor-pointer` — le `object-cover` + dimensions carrées forcent un crop visuel centré, la photo originale est stockée en ratio libre |
| Hover desktop | `hover:opacity-90 transition-opacity ring-2 ring-transparent hover:ring-primary/30` |
| Click | Ouvre la photo en lightbox (plein écran, ratio original) |
| Alt text | Le filename original (sans extension), ex: "IMG_2847" |

### Détails de l'affichage — une seule photo (exception)

Quand un commentaire n'a qu'**une seule photo**, elle est affichée en **ratio libre** (pas de crop carré). Cela donne plus de place à la photo et un rendu plus naturel quand il n'y a pas besoin d'aligner plusieurs vignettes.

| Élément | Valeur |
| --- | --- |
| Taille | `max-w-xs` (~320px de large), hauteur auto (ratio préservé) |
| Style image | `rounded-lg object-cover cursor-pointer` — mais **sans dimensions carrées forcées**, le ratio original est visible |
| Hover / Click / Alt | Identiques aux vignettes multiples |

### Lightbox (viewer plein écran)

Réutiliser le composant `AttachmentViewerDialog` existant (`src/components/moments/attachment-viewer-dialog.tsx`) en mode image. La lightbox affiche **toujours** la photo en ratio original, que la vignette soit carrée ou non. Comportements :

- Overlay sombre, photo centrée en `max-w-full max-h-[90vh] object-contain`
- Bouton fermer (`X`) en haut à droite
- Fermeture via Escape, clic sur l'overlay, ou bouton `X`
- **Pas de navigation entre photos** (V1). L'utilisateur ferme et clique sur la suivante.
- **Pas de bouton télécharger** (V1). Les photos de commentaires sont de la social proof, pas des livrables.

### Commentaire texte seul (inchangé)

Aucun changement visuel pour les commentaires sans photo. Pas de placeholder "Aucune photo" ni d'espace réservé.

---

## Architecture technique

### Modèle de données

Nouvelle table `comment_attachments` :

```prisma
model CommentAttachment {
  id          String   @id @default(cuid())
  commentId   String
  url         String                          // URL Vercel Blob
  filename    String                          // Nom original
  contentType String                          // image/jpeg, image/png, image/webp
  sizeBytes   Int
  createdAt   DateTime @default(now())

  comment Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@index([commentId])
  @@map("comment_attachments")
}
```

Relation inverse sur Comment :

```prisma
// Ajout dans model Comment
attachments CommentAttachment[]
```

**Pas de backfill** : table nouvelle, les commentaires existants n'ont simplement pas d'attachments.

### Architecture hexagonale

| Couche | Fichier | Responsabilité |
| --- | --- | --- |
| **Domain model** | `domain/models/comment-attachment.ts` | Type `CommentAttachment`, constantes (`MAX_COMMENT_PHOTOS`, `MAX_COMMENT_PHOTO_SIZE_BYTES`, `ALLOWED_COMMENT_PHOTO_TYPES`) |
| **Domain model** | `domain/models/comment.ts` | Enrichir `CommentWithUser` avec `attachments: CommentAttachment[]` |
| **Domain errors** | `domain/errors/comment-attachment-errors.ts` | `CommentPhotoLimitReachedError`, `CommentPhotoTooLargeError`, `CommentPhotoTypeNotAllowedError` |
| **Domain port** | `domain/ports/repositories/comment-attachment-repository.ts` | Interface `CommentAttachmentRepository` |
| **Domain usecase** | `domain/usecases/add-comment.ts` | Modifier pour accepter des photos en entrée (upload atomique) |
| **Domain usecase** | `domain/usecases/delete-comment.ts` | Modifier pour supprimer les blobs associés |
| **Infra repository** | `infrastructure/repositories/prisma-comment-attachment-repository.ts` | Implémentation Prisma |
| **Infra repository** | `infrastructure/repositories/prisma-comment-repository.ts` | Modifier `findByMomentIdWithUser` pour inclure les attachments |
| **App action** | `app/actions/comment.ts` | Modifier `addCommentAction` pour accepter `FormData`, modifier `deleteCommentAction` pour nettoyer les blobs |
| **Lib (refactor)** | `lib/sanitize-filename.ts` | Extraire `sanitizeFilename()` depuis `add-moment-attachment.ts` vers un utilitaire partagé. Mettre à jour l'import dans `add-moment-attachment.ts`. |
| **UI utility** | `lib/image-compress.ts` | Nouvelle fonction `compressCommentPhoto()` (compression conditionnelle, ratio préservé) |
| **UI component** | `components/moments/comment-thread.tsx` | Enrichir avec bouton photo, previews, affichage photos, enrichir PostHog `comment_posted` avec `photo_count` |

### Flux d'upload atomique

```
1. Participant sélectionne des photos dans le CommentThread
   → Client : compressCommentPhoto() si > 3 Mo (Canvas API, ratio préservé, max 1920px, WebP)
   → Client : preview miniature locale (URL.createObjectURL)

2. Participant clique "Commenter"
   → Client : construit un FormData { content: string, photo-0: File, photo-1: File, ... }
   → Client : appelle addCommentAction(momentId, formData)

3. Server action addCommentAction
   → Auth check
   → Rate limit (même pool que les commentaires texte, pas un rate limit séparé)
   → Pour chaque photo : fileTypeFromBuffer() → validation MIME + taille
   → Appelle addComment() usecase avec les fichiers validés
   → Le usecase crée le commentaire ET les attachments en séquence :
     a. Crée le Comment en DB
     b. Pour chaque photo : upload Vercel Blob → crée CommentAttachment en DB
   → revalidatePath

4. Si une photo échoue à l'upload :
   → Le commentaire est déjà créé (avec les photos précédentes)
   → Log l'erreur dans Sentry
   → Le commentaire apparaît avec les photos qui ont réussi
   → Pas de rollback (cohérence : mieux vaut un commentaire partiel qu'aucun commentaire)
```

### Modification du usecase `addComment`

Le usecase `addComment` est enrichi pour accepter des fichiers optionnels :

```typescript
type AddCommentInput = {
  momentId: string;
  userId: string;
  content: string;
  photos?: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }[];
};

type AddCommentDeps = {
  commentRepository: CommentRepository;
  momentRepository: MomentRepository;
  registrationRepository?: RegistrationRepository;
  // Nouveaux deps optionnels (absents = pas de photos)
  commentAttachmentRepository?: CommentAttachmentRepository;
  storage?: StorageService;
};
```

La logique ajoutée (en deux phases : **validation avant création, upload après**) :

```typescript
// ── Phase 1 : validation de TOUTES les photos AVANT de créer le commentaire ──
// On échoue vite et proprement, sans side-effect en DB ni en storage.
if (input.photos?.length && commentAttachmentRepository && storage) {
  if (input.photos.length > MAX_COMMENT_PHOTOS) {
    throw new CommentPhotoLimitReachedError(MAX_COMMENT_PHOTOS);
  }
  for (const photo of input.photos) {
    if (!ALLOWED_COMMENT_PHOTO_TYPES.has(photo.contentType)) {
      throw new CommentPhotoTypeNotAllowedError(photo.contentType);
    }
    if (photo.sizeBytes > MAX_COMMENT_PHOTO_SIZE_BYTES) {
      throw new CommentPhotoTooLargeError(MAX_COMMENT_PHOTO_SIZE_BYTES);
    }
  }
}

// Création du commentaire (existant, inchangé)
const comment = await commentRepository.create({ ... });

// ── Phase 2 : upload des photos (toutes validées, commentaire créé) ──
// Les erreurs ici sont des erreurs réseau/blob, pas des erreurs de validation.
// En cas d'échec partiel : le commentaire existe avec les photos déjà uploadées.
// Mieux vaut un commentaire partiel qu'aucun commentaire.
if (input.photos?.length && commentAttachmentRepository && storage) {
  for (const photo of input.photos) {
    const safeName = sanitizeFilename(photo.filename);
    const path = `comment-photos/${comment.id}-${Date.now()}-${safeName}`;
    const url = await storage.upload(path, photo.buffer, photo.contentType);

    await commentAttachmentRepository.create({
      commentId: comment.id,
      url,
      filename: photo.filename,
      contentType: photo.contentType,
      sizeBytes: photo.sizeBytes,
    });
  }
}
```

Les nouvelles dépendances sont optionnelles : les tests existants de `addComment` continuent de fonctionner sans modification (pas de photos = ancien comportement).

### Modification du usecase `deleteComment`

Le usecase `deleteComment` doit nettoyer les blobs des photos :

```typescript
type DeleteCommentDeps = {
  commentRepository: CommentRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  // Nouveaux deps optionnels
  commentAttachmentRepository?: CommentAttachmentRepository;
  storage?: StorageService;
};
```

Avant la suppression du commentaire en DB :

```typescript
// Supprimer les blobs des photos (best-effort, log les erreurs)
if (commentAttachmentRepository && storage) {
  const attachments = await commentAttachmentRepository.findByComment(comment.id);
  for (const att of attachments) {
    try {
      await storage.delete(att.url);
    } catch (err) {
      // Log mais ne bloque pas la suppression
      console.error(`Failed to delete blob for comment attachment ${att.id}`, err);
    }
  }
}
// La suppression du commentaire en DB cascade sur comment_attachments
await commentRepository.delete(input.commentId);
```

### Modification de `addCommentAction` (server action)

La signature passe de `(momentId, content)` à `(momentId, formData)` :

```typescript
export async function addCommentAction(
  momentId: string,
  formData: FormData
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user?.id) { ... }

  const content = formData.get("content") as string;
  const photoFiles: File[] = [];
  for (let i = 0; i < 3; i++) {
    const f = formData.get(`photo-${i}`) as File | null;
    if (f && f.size > 0) photoFiles.push(f);
  }

  // Validation et détection MIME pour chaque photo
  const photos = await Promise.all(
    photoFiles.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const detected = await fileTypeFromBuffer(buffer);
      if (!detected || !ALLOWED_COMMENT_PHOTO_TYPES.has(detected.mime)) {
        throw new CommentPhotoTypeNotAllowedError(detected?.mime ?? "unknown");
      }
      if (buffer.length > MAX_COMMENT_PHOTO_SIZE_BYTES) {
        throw new CommentPhotoTooLargeError(MAX_COMMENT_PHOTO_SIZE_BYTES);
      }
      return {
        buffer,
        filename: file.name,
        contentType: detected.mime,
        sizeBytes: buffer.length,
      };
    })
  );

  return toActionResult(async () => {
    const result = await addComment(
      { momentId, userId, content, photos },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
        registrationRepository: prismaRegistrationRepository,
        commentAttachmentRepository: prismaCommentAttachmentRepository,
        storage: vercelBlobStorageService,
      }
    );
    // Notifications (inchangées)
    // ...
    return result.comment;
  });
}
```

### Port `CommentAttachmentRepository`

```typescript
// src/domain/ports/repositories/comment-attachment-repository.ts

export type CreateCommentAttachmentInput = {
  commentId: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export interface CommentAttachmentRepository {
  create(input: CreateCommentAttachmentInput): Promise<CommentAttachment>;
  findByComment(commentId: string): Promise<CommentAttachment[]>;
  deleteByComment(commentId: string): Promise<void>;
}
```

### Constantes du domaine

```typescript
// src/domain/models/comment-attachment.ts

export type CommentAttachment = {
  id: string;
  commentId: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
};

export const MAX_COMMENT_PHOTOS = 3;
export const MAX_COMMENT_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
export const CLIENT_COMPRESS_THRESHOLD_BYTES = 3 * 1024 * 1024; // 3 Mo

export const ALLOWED_COMMENT_PHOTO_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
```

### Utilitaire client `compressCommentPhoto()`

```typescript
// src/lib/image-compress.ts

/**
 * Compresse une photo de commentaire si elle dépasse le seuil de 3 Mo.
 * Contrairement à resizeImage() (crop carré pour avatars/covers),
 * cette fonction préserve le ratio d'origine.
 *
 * - Si le fichier ≤ 3 Mo → retourné tel quel
 * - Si > 3 Mo → redimensionné (max 1920px côté long), qualité 0.8, WebP
 * - Le ratio d'origine est TOUJOURS préservé (pas de crop)
 */
export async function compressCommentPhoto(file: File): Promise<Blob> {
  if (file.size <= CLIENT_COMPRESS_THRESHOLD_BYTES) {
    return file;
  }

  const maxDimension = 1920;
  const quality = 0.8;
  const format = "image/webp";

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { naturalWidth: w, naturalHeight: h } = img;

      // Scale down: le côté le plus long → maxDimension, ratio préservé
      let targetW = w;
      let targetH = h;
      if (w > maxDimension || h > maxDimension) {
        if (w >= h) {
          targetW = maxDimension;
          targetH = Math.round(h * (maxDimension / w));
        } else {
          targetH = maxDimension;
          targetW = Math.round(w * (maxDimension / h));
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context unavailable")); return; }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (blob) { resolve(blob); }
          else {
            // Fallback JPEG
            canvas.toBlob(
              (fb) => fb ? resolve(fb) : reject(new Error("Export failed")),
              "image/jpeg",
              quality
            );
          }
        },
        format,
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}
```

### Réutilisation des briques existantes

| Brique | Source | Usage |
| --- | --- | --- |
| `StorageService` (port) | `domain/ports/services/storage-service.ts` | Tel quel, même interface `upload()`/`delete()` |
| `VercelBlobStorageService` (adapter) | `infrastructure/services/storage/vercel-blob-storage-service.ts` | Tel quel |
| `isUploadedUrl()` | `lib/blob.ts` | Pour le cleanup des blobs dans `deleteComment` |
| `fileTypeFromBuffer` | `file-type` (dépendance existante) | Validation MIME serveur |
| `sanitizeFilename()` | Pattern de `add-moment-attachment.ts` | Copier la même logique pour les noms de fichiers photos |
| `AttachmentViewerDialog` | `components/moments/attachment-viewer-dialog.tsx` | Lightbox plein écran pour agrandir les photos |
| `isImageAttachment()` | `components/moments/attachment-format.ts` | Détection image pour le rendu |
| `formatAttachmentSize()` | `components/moments/attachment-format.ts` | Affichage taille si nécessaire |
| `toActionResult()` | `app/actions/helpers/to-action-result.ts` | Pattern de gestion d'erreur des server actions |

### Convention de stockage Vercel Blob

Les photos sont stockées avec le préfixe `comment-photos/` :

```
comment-photos/{commentId}-{timestamp}-{sanitized-filename}
```

Exemples :
- `comment-photos/cm1abc-1713024000000-img-2847.webp`
- `comment-photos/cm1abc-1713024000001-photo-soiree.jpeg`

### Sécurité

- **MIME par magic bytes** : le type réel est détecté par `fileTypeFromBuffer()`, le content-type déclaré par le client est ignoré
- **Taille re-vérifiée** : côté serveur après lecture du buffer (le client peut mentir ou la compression peut échouer)
- **Pas de XSS** : les filenames sont affichés via React (échappement natif), jamais via `dangerouslySetInnerHTML`
- **Rate limiting** : même pool que le commentaire texte (pas de rate limit séparé pour les photos), via le rate limiter existant si ajouté aux commentaires à l'avenir
- **Accès PENDING\_APPROVAL bloqué** : le check existant dans `addComment` bloque aussi l'envoi de photos (même code path)
- **Cleanup blobs** : les blobs sont supprimés best-effort à la suppression du commentaire. Le `onDelete: Cascade` en Prisma supprime les lignes DB automatiquement.
- **Pas d'exécution de code** : seuls les types image sont acceptés (JPEG, PNG, WebP). Pas de SVG (vecteur d'attaque XSS), pas de PDF, pas de format exécutable.

### Analytics (PostHog)

L'event `comment_posted` existant est enrichi avec le nombre de photos :

```typescript
posthog.capture("comment_posted", {
  moment_id: momentId,
  photo_count: photoFiles.length,  // 0 si commentaire texte seul
});
```

Cela permet de mesurer l'adoption de la feature (% de commentaires avec photos, distribution du nombre de photos).

---

## i18n — Clés à ajouter

Dans le namespace `Moment.comments` existant (FR et EN) :

### Français

```json
{
  "comments": {
    "addPhotos": "Ajouter des photos",
    "addPhotosDisabled": "Limite de 3 photos atteinte",
    "removePhoto": "Retirer cette photo",
    "photoTypeError": "Format non supporté. JPG, PNG ou WebP uniquement.",
    "photoTooLargeError": "Photo trop volumineuse, même après compression.",
    "photoUploadError": "Erreur lors de l'envoi. Réessayez.",
    "photoCount": "{count}/3 photos"
  }
}
```

### Anglais

```json
{
  "comments": {
    "addPhotos": "Add photos",
    "addPhotosDisabled": "3 photos limit reached",
    "removePhoto": "Remove this photo",
    "photoTypeError": "Unsupported format. JPG, PNG or WebP only.",
    "photoTooLargeError": "Photo too large, even after compression.",
    "photoUploadError": "Failed to send. Try again.",
    "photoCount": "{count}/3 photos"
  }
}
```

---

## Stratégie de tests

### Tests unitaires (Vitest, domain/)

**`add-comment.test.ts`** (enrichir les tests existants) :

- Given valid content + 2 valid photos → should create comment + 2 attachments
- Given valid content + 0 photos → should create comment only (rétro-compatible)
- Given 4 photos → should throw `CommentPhotoLimitReachedError`
- Given photo with `image/gif` type → should throw `CommentPhotoTypeNotAllowedError`
- Given photo > 5 Mo → should throw `CommentPhotoTooLargeError`
- Given valid photos but empty content → should throw `CommentContentEmptyError` (texte obligatoire)
- `test.each` sur les types autorisés/refusés : JPEG oui, PNG oui, WebP oui, GIF non, PDF non, SVG non
- `test.each` sur les tailles limites : 5 Mo exact oui, 5 Mo + 1 byte non
- Given valid photos + valid content but 4 photos → should throw BEFORE creating the comment (aucun side-effect en DB)
- Given user with PENDING_APPROVAL registration + valid photos → should throw `MomentNotFoundError` (même blocage que pour le texte seul, vérifie que les photos ne contournent pas le check)

**`delete-comment.test.ts`** (enrichir) :

- Given comment with photos + user is author → should delete blobs then comment
- Given comment with photos + user is host → should delete blobs then comment
- Given blob delete fails → should still delete comment (best-effort cleanup)

### Tests d'intégration (Vitest, infrastructure/)

**`prisma-comment-attachment-repository.test.ts`** (nouveau) :

- `create` : insère et retourne un `CommentAttachment`
- `findByComment` : retourne les attachments d'un commentaire, ordonnés par `createdAt`
- `deleteByComment` : supprime tous les attachments d'un commentaire
- Cascade : supprimer un Comment supprime ses CommentAttachments

**`prisma-comment-repository.test.ts`** (enrichir) :

- `findByMomentIdWithUser` : les commentaires incluent leurs attachments

### Tests E2E (Playwright)

**Dans le fichier de tests des commentaires existant** (enrichir) :

- **Parcours poster un commentaire avec photo** :
  - Se connecter → page événement → saisir texte → ajouter une photo → commenter
  - Vérifier que le commentaire apparaît avec la photo

- **Parcours limite photos** :
  - Ajouter 3 photos → vérifier que le bouton photo est grisé
  - Retirer une photo → vérifier que le bouton redevient actif

- **Parcours suppression** :
  - Poster un commentaire avec photo → supprimer le commentaire
  - Vérifier que le commentaire et ses photos disparaissent

- **Parcours format refusé** :
  - Tenter d'ajouter un .txt ou .pdf → vérifier le message d'erreur

---

## Plan d'implémentation

| Phase | Contenu | Dépendances |
| --- | --- | --- |
| **1. Schema** | Modèle Prisma `CommentAttachment` + relation sur `Comment` + `db:push` dev/prod | Aucune |
| **2. Domain** | `comment-attachment.ts` (modèle + constantes), `comment-attachment-errors.ts`, port `CommentAttachmentRepository`, enrichir `CommentWithUser` avec `attachments` | Phase 1 |
| **3. Refactor** | Extraire `sanitizeFilename()` de `add-moment-attachment.ts` vers `lib/sanitize-filename.ts`, mettre à jour l'import dans `add-moment-attachment.ts` | Aucune |
| **4. Infrastructure** | `PrismaCommentAttachmentRepository`, modifier `PrismaCommentRepository.findByMomentIdWithUser` pour inclure attachments | Phase 2 |
| **5. Utilitaire client** | `lib/image-compress.ts` : `compressCommentPhoto()` (ratio préservé, seuil 3 Mo) | Aucune |
| **6. Usecases** | Modifier `addComment` (validation photos avant création, upload après) + `deleteComment` (cleanup blobs) + tests unitaires (inclut test PENDING_APPROVAL + photos) | Phases 2-4 |
| **7. Server action** | Modifier `addCommentAction` (FormData) + `deleteCommentAction` (cleanup blobs) | Phase 6 |
| **8. UI** | Enrichir `CommentThread` : bouton photo, previews, affichage photos, lightbox, enrichir PostHog `comment_posted` avec `photo_count` | Phases 5, 7 |
| **9. i18n + tests** | Clés FR/EN + tests E2E Playwright | Phase 8 |
| **10. Page Aide** | Mettre à jour la page Aide (Help dans fr.json + en.json) pour mentionner les photos dans les commentaires | Phase 9 |

---

## Hors scope V1 (évolutions futures)

- **Navigation entre photos** dans la lightbox (flèches prev/next)
- **Galerie de photos de l'événement** : vue agrégée de toutes les photos postées dans les commentaires
- **Suppression individuelle d'une photo** dans un commentaire existant (sans supprimer le commentaire)
- **Drag-and-drop** de photos dans le textarea (en V1, uniquement via le bouton/input file)
- **Pasting** d'images depuis le presse-papier (Ctrl+V)
- **GIF animés** (type `image/gif` non autorisé en V1)
- **Vidéos** courtes
- **Mentions** (@utilisateur) dans les commentaires
- **Réactions** (like/emoji) sur les commentaires
- **Notifications enrichies** : inclure une miniature de la photo dans l'email de notification
- **Compression serveur** : re-compression côté serveur pour les navigateurs qui ne supportent pas le Canvas API
- **Quotas** : limite globale de stockage par Communauté
- **Garbage collection** des blobs orphelins
