# Pièces jointes d'événement — Spec

> Permettre à un Organisateur d'attacher jusqu'à 3 documents (PDF ou image) à un événement, consultables dans une modale sur la page événement publique.

---

## Vision produit

Certains événements ont besoin d'informations riches qui ne tiennent pas dans la description texte :

- **Food truck** → menu du jour en PDF ou photo d'ardoise
- **Exposition / vernissage** → invitation visuelle, catalogue des œuvres, plan de la galerie
- **Conférence / meetup** → programme détaillé, plan d'accès
- **Atelier** → liste de matériel à apporter, mémo technique

Ces documents sont **publics** par nature — ils servent à présenter l'événement, pas à récompenser l'inscription. Ils doivent être **discrets** (ne pas dominer la page) mais **facilement accessibles** (un clic ouvre le contenu).

### Positionnement

- **Discret** : la section ne doit pas voler la vedette à la description, au CTA ou à la social proof
- **Cohérent avec Luma** : les pages événement restent premium et sobres, les documents s'intègrent sans casser le rythme
- **Minimaliste** : feature masquée dans les "Options avancées" du formulaire — 90% des événements n'ont pas de pièces jointes, on ne pollue pas l'UX de base
- **Unifié** : PDFs et images traités pareil (même composant, même modale, même interaction) — pas de logique spéciale par type côté UX

---

## Règles produit

| Règle | Valeur |
| --- | --- |
| **Nombre maximum** | 3 fichiers par événement |
| **Types acceptés** | PDF (`application/pdf`), JPEG, PNG, WEBP |
| **Taille maximum** | 10 MB par fichier |
| **Qui upload** | Uniquement les Organisateurs (HOST) du Circle du Moment |
| **Qui peut consulter** | Tout le monde qui peut voir la page événement (publique pour Moment PUBLISHED d'un Circle public, membres pour privé) |
| **Ordre d'affichage** | Par date d'ajout croissante (pas de réordonnancement manuel en V1) |
| **Visibilité** | Publique (pas d'auth sur l'URL blob) |

### Validation côté serveur

- Type MIME vérifié au-delà de l'extension (magic number via `file-type` ou équivalent)
- Taille re-vérifiée après upload
- Nombre total par Moment vérifié avant insertion (rejet si ≥ 3)
- Ownership : seul un `HOST` du Circle du Moment peut upload/delete

### Validation côté client

- Feedback immédiat sur type/taille avant upload réseau
- Progress bar pendant l'upload
- Messages d'erreur inline, contextuels

---

## UX — Page événement publique

### Position

Sous la description, avant la liste des participants. La section est **entièrement masquée** si aucun document.

```
┌─ [HERO] image de couverture, titre, date, lieu ─┐
│                                                  │
├─ [CTA] S'inscrire ──────────────────────────────┤
│                                                  │
├─ [DESCRIPTION] texte de l'événement ────────────┤
│                                                  │
├─ [DOCUMENTS] ← nouvelle section, compacte ─────┤
│                                                  │
├─ [PARTICIPANTS]                                  │
│                                                  │
└─ [COMMENTAIRES] ─────────────────────────────────┘
```

### Rendu de la liste

Cartes compactes, identiques pour tous les types de fichiers.

```
  Documents

  ┌─────────────────────────────────────┐
  │ 📄  Menu du food truck         →   │
  │     PDF · 1,2 MB                    │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │ 🖼️  Affiche du vernissage       →   │
  │     JPG · 780 KB                    │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │ 📄  Plan de la galerie         →   │
  │     PDF · 850 KB                    │
  └─────────────────────────────────────┘
```

### Détails visuels

| Élément | Valeur |
| --- | --- |
| Titre de section | `h3 "Documents"`, `text-sm font-semibold uppercase tracking-wider text-muted-foreground`, `mb-3` |
| Hauteur de carte | `min-h-14` (56px) |
| Bordure | `border border-border rounded-lg` |
| Padding | `px-4 py-3` |
| Icône (gauche) | `FileText` (PDF) ou `ImageIcon` (image), `size-5 text-muted-foreground`, marge droite 12px |
| Titre fichier | `text-sm font-medium text-foreground`, sans extension |
| Meta (type + taille) | `text-xs text-muted-foreground`, format "PDF · 1,2 MB" |
| Flèche (droite) | `ChevronRight size-4 text-muted-foreground` |
| Hover | `hover:bg-muted/50 transition-colors cursor-pointer` |
| Espacement entre cartes | `space-y-2` (8px) |
| Click | Ouvre la **modale de consultation** |

### Format de la taille

- < 1 MB → "X KB" (arrondi)
- ≥ 1 MB → "X,Y MB" (1 décimale, virgule en FR)

### Format du nom

Le nom affiché est le filename original **sans l'extension** (ex: "menu-foodtruck.pdf" → "menu-foodtruck"). L'extension est redondante avec la meta.

---

## UX — Modale de consultation

Composant `<AttachmentViewerDialog />` réutilisable, basé sur `Dialog` de shadcn/ui.

### Structure

```
┌────────────────────────────────────────────────┐
│  Menu du food truck                  [↓] [×]  │  ← header
│  PDF · 1,2 MB                                  │     titre, meta, actions
├────────────────────────────────────────────────┤
│                                                │
│                                                │
│                                                │
│            [contenu du document]               │  ← zone d'affichage
│                                                │     PDF: <iframe>
│                                                │     Image: <img>
│                                                │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
```

### Comportement

- **Largeur** : `max-w-4xl` desktop, `max-w-full` mobile
- **Hauteur** : 90vh desktop, `h-full` mobile
- **Header** : filename complet, meta (type · taille), bouton Télécharger (icône `Download`), bouton Fermer (icône `X`)
- **Corps** :
  - Si **image** → `<img src={url} alt={filename} className="max-h-full max-w-full object-contain" />`
  - Si **PDF** → `<iframe src={url} className="w-full h-full" title={filename} />` — le navigateur utilise son reader natif
- **Fermeture** : Escape, clic hors de la modale, bouton `X`
- **Focus trap** : géré par `Dialog` shadcn
- **Scroll lock** : le body ne scroll plus quand la modale est ouverte

### Bouton de téléchargement

L'attribut HTML `download` ne fonctionne pas pour les ressources cross-origin (Vercel Blob est sur `*.public.blob.vercel-storage.com`). Solution : route API proxy.

```
GET /api/moments/[id]/attachments/[attachmentId]/download
  → Vérifie que le Moment est visible par l'appelant (public ou membre)
  → Fetch le blob Vercel
  → Retourne avec headers :
     Content-Type: <contentType original>
     Content-Disposition: attachment; filename="<filename>"
     Content-Length: <sizeBytes>
```

Dans la modale, le bouton est un `<a href="/api/.../download">` simple.

### Navigation entre documents

**Pas en V1.** Si l'utilisateur veut voir un autre document, il ferme et clique sur la carte suivante. Flèches prev/next ajoutables en V1.1 si le besoin émerge.

### Mobile

- Modale en plein écran (`h-full w-full`, pas de marges)
- L'iframe PDF fonctionne sur Chrome mobile Android
- **Cas iOS Safari** : l'iframe PDF peut être pataud. Fallback acceptable : ajouter un lien "Ouvrir dans un nouvel onglet" visible dans le header mobile, qui utilise le reader PDF natif iOS

### Accessibilité

- Titre de la modale lisible par screen readers (`aria-labelledby` pointant sur le titre)
- Focus trap (géré nativement par shadcn Dialog)
- Boutons avec labels ARIA : "Télécharger {filename}", "Fermer"
- Escape pour fermer (géré nativement)

---

## UX — Formulaire de création/édition (côté Organisateur)

### Position dans le formulaire

Dans la **section "Options avancées"** du formulaire événement (masquée par défaut via un toggle/accordéon). C'est une fonctionnalité optionnelle — elle ne doit pas encombrer le formulaire de base.

### État initial (aucun document)

```
  Documents (optionnel)                0/3 fichiers

  ┌─────────────────────────────────────┐
  │                                     │
  │        Glissez vos fichiers ici     │
  │                                     │
  │               ou                    │
  │                                     │
  │           [Parcourir]               │
  │                                     │
  │    PDF, JPG, PNG, WEBP · Max 10 MB  │
  │                                     │
  └─────────────────────────────────────┘
```

### État pendant l'upload

```
  Documents (optionnel)                1/3 fichiers

  ┌─────────────────────────────────────┐
  │ 📄  catalogue.pdf              [×] │
  │     [████████░░░░] 62% · 2,3 MB     │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │        [+ Ajouter un document]      │
  └─────────────────────────────────────┘
```

### État après upload

```
  Documents (optionnel)                2/3 fichiers

  ┌─────────────────────────────────────┐
  │ 📄  menu-foodtruck.pdf         [×] │
  │     1,2 MB                          │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │ 🖼️  affiche.jpg                [×] │
  │     780 KB                          │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │        [+ Ajouter un document]      │
  └─────────────────────────────────────┘
```

### Limite atteinte (3 fichiers)

Le bouton "Ajouter un document" disparaît. Le compteur affiche "3/3 fichiers".

### Drag-and-drop

- Zone de drop active sur toute la dropzone et sur la zone des cartes existantes
- Highlight visuel au survol d'un fichier (`border-dashed border-primary bg-primary/5`)
- Multi-fichiers supporté (on peut déposer 2 fichiers d'un coup)
- Fallback input `<input type="file" multiple>` pour le bouton "Parcourir"

### Messages d'erreur (inline, sous la carte en erreur)

| Cas | Message |
| --- | --- |
| Type non supporté | "Format non supporté. PDF, JPG, PNG ou WEBP uniquement." |
| Fichier trop gros | "Fichier trop volumineux. Maximum 10 MB." |
| Limite atteinte | "Vous avez atteint la limite de 3 documents." |
| Erreur réseau | "Erreur lors de l'envoi. Réessayer." (avec bouton retry) |

### Suppression

Bouton `[×]` (icône `X` taille 16px) en haut à droite de chaque carte. Confirmation via `AlertDialog` : "Supprimer ce document ? Cette action est irréversible."

---

## Architecture technique

### Modèle de données

Nouvelle table `moment_attachments` :

```prisma
model MomentAttachment {
  id          String   @id @default(cuid())
  momentId    String
  url         String                          // URL Vercel Blob
  filename    String                          // Nom original
  contentType String                          // application/pdf, image/jpeg, ...
  sizeBytes   Int
  createdAt   DateTime @default(now())
  moment      Moment   @relation(fields: [momentId], references: [id], onDelete: Cascade)

  @@index([momentId])
  @@map("moment_attachments")
}
```

Relation inverse sur Moment :

```prisma
// Ajout dans model Moment
attachments MomentAttachment[]
```

### Architecture hexagonale

| Couche | Fichier | Responsabilité |
| --- | --- | --- |
| **Domain** | `domain/models/moment-attachment.ts` | Type `MomentAttachment` |
| **Domain** | `domain/ports/repositories/moment-attachment-repository.ts` | Interface : `create`, `delete`, `findByMoment`, `findById`, `countByMoment` |
| **Domain** | ~~`domain/ports/services/file-storage.ts`~~ | **Réutiliser le port existant \****`StorageService`** (`domain/ports/services/storage-service.ts`) — aucun nouveau port à créer |
| **Domain** | `domain/usecases/add-moment-attachment.ts` | Validation taille/type/count, appel storage, insertion DB |
| **Domain** | `domain/usecases/remove-moment-attachment.ts` | Ownership check, suppression DB + blob |
| **Domain** | `domain/errors/moment-attachment-errors.ts` | `AttachmentLimitReachedError`, `AttachmentTooLargeError`, `AttachmentTypeNotAllowedError`, `AttachmentNotFoundError` |
| **Infra** | `infrastructure/repositories/prisma-moment-attachment-repository.ts` | Impl Prisma |
| **Infra** | `infrastructure/services/storage/vercel-blob-storage-service.ts` | **Adapter existant** — déjà utilisé pour cover image et avatar. Rien à créer. |
| **App (actions)** | `app/actions/moment-attachments.ts` | Server actions : `uploadMomentAttachmentAction`, `deleteMomentAttachmentAction` (multipart FormData, pattern identique à `processCoverImage` et `uploadAvatarAction`) |
| **App (route)** | `app/api/moments/[id]/attachments/[attachmentId]/download/route.ts` | **Seule route API** (nécessaire car retourne un stream binaire — pas possible en server action) |
| **Components** | `components/moments/moment-attachments-list.tsx` | Liste publique sur page événement (desktop + mobile) |
| **Components** | `components/moments/moment-attachments-editor.tsx` | Dropzone + cartes dans le formulaire |
| **Components** | `components/moments/attachment-viewer-dialog.tsx` | Modale de consultation |
| **Components** | `components/moments/attachment-card.tsx` | Carte unitaire (utilisée dans la liste publique et l'éditeur) |

### Port `StorageService` existant (à réutiliser)

Le port existe déjà et n'est **pas** à modifier :

```typescript
// src/domain/ports/services/storage-service.ts
export interface StorageService {
  upload(path: string, file: Buffer | Blob, contentType: string): Promise<string>;
  delete(url: string): Promise<void>;
}
```

L'adapter `VercelBlobStorageService` est déjà utilisé par `processCoverImage()` (cover image) et `uploadAvatarAction()` (avatar). La convention de naming de path est **plate** (pas de sous-dossiers par entité) :

- Cover : `covers/${Date.now()}.webp`
- Avatar : `avatars/${userId}-${Date.now()}.${ext}`
- **Attachments (nouveau)** : `moment-attachments/${momentId}-${Date.now()}-${safeFilename}`

Où `safeFilename` est le filename original nettoyé (suppression des caractères non ASCII et remplacement des espaces par `-`) pour éviter les collisions et rester URL-safe.

### Usecase `AddMomentAttachment` — logique

```typescript
async execute({ momentId, userId, file }: AddMomentAttachmentInput) {
  // 1. Ownership check
  const moment = await momentRepo.findById(momentId);
  if (!moment) throw new MomentNotFoundError();
  const isHost = await circleRepo.isHost(moment.circleId, userId);
  if (!isHost) throw new UnauthorizedError();

  // 2. Limit check
  const count = await attachmentRepo.countByMoment(momentId);
  if (count >= MAX_ATTACHMENTS_PER_MOMENT) {
    throw new AttachmentLimitReachedError();
  }

  // 3. Type/size validation
  if (!ALLOWED_CONTENT_TYPES.has(file.contentType)) {
    throw new AttachmentTypeNotAllowedError();
  }
  if (file.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new AttachmentTooLargeError();
  }

  // 4. Upload to storage (StorageService existant — pattern identique à cover image)
  const safeFilename = sanitizeFilename(file.filename); // strip non-ASCII, replace spaces with "-"
  const path = `moment-attachments/${momentId}-${Date.now()}-${safeFilename}`;
  const url = await storage.upload(path, file.buffer, file.contentType);

  // 5. Persist — on garde le filename ORIGINAL pour l'affichage, pas le safeFilename
  return attachmentRepo.create({
    momentId,
    url,
    filename: file.filename,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
  });
}
```

> **Pas de conversion WebP** : contrairement à `processCoverImage()` qui force la conversion en WebP, on garde ici le format d'origine (le participant doit pouvoir télécharger un fichier identique à ce que l'organisateur a uploadé, quel que soit le format).

Constantes :

```typescript
const MAX_ATTACHMENTS_PER_MOMENT = 3;
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
```

### Server action upload — `uploadMomentAttachmentAction`

Pattern **identique** à `processCoverImage()` et `uploadAvatarAction()` (server action avec FormData, pas de route API).

```typescript
// src/app/actions/moment-attachments.ts
"use server";

export async function uploadMomentAttachmentAction(
  momentId: string,
  formData: FormData
): Promise<ActionResult<MomentAttachment>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };

  // Rate limit — première utilisation concrète du port RateLimiter
  const rateResult = await rateLimiter.checkLimit(
    `attachment-upload:${session.user.id}`,
    10,             // maxRequests
    60 * 1000       // windowMs (1 minute)
  );
  if (!rateResult.allowed) {
    return { success: false, error: "Trop de tentatives", code: "RATE_LIMITED" };
  }

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "File missing", code: "MISSING_FILE" };

  // Magic number check (type réel du fichier, pas le header déclaré)
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer); // from "file-type"
  if (!detected || !ALLOWED_CONTENT_TYPES.has(detected.mime)) {
    return { success: false, error: "TYPE_NOT_ALLOWED", code: "TYPE_NOT_ALLOWED" };
  }

  try {
    const attachment = await addMomentAttachment.execute({
      momentId,
      userId: session.user.id,
      file: {
        buffer,
        filename: file.name,
        contentType: detected.mime, // on utilise le contentType DETECTE, pas celui declare
        sizeBytes: buffer.length,
      },
    });
    revalidatePath(`/m/[slug]`, "page");
    return { success: true, data: attachment };
  } catch (err) {
    return mapAttachmentErrorToActionResult(err);
  }
}
```

### Server action delete — `deleteMomentAttachmentAction`

```typescript
export async function deleteMomentAttachmentAction(
  attachmentId: string
): Promise<ActionResult<null>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };

  try {
    await removeMomentAttachment.execute({ attachmentId, userId: session.user.id });
    revalidatePath(`/m/[slug]`, "page");
    return { success: true, data: null };
  } catch (err) {
    return mapAttachmentErrorToActionResult(err);
  }
}
```

### Route API download — `GET /api/moments/[id]/attachments/[attachmentId]/download`

**C'est la SEULE route API de cette feature** — nécessaire car on retourne un stream binaire avec un header `Content-Disposition`, ce qui n'est pas faisable en server action.

- Visibilité check : le Moment doit être visible par l'appelant (même règles que la page événement — public si `PUBLISHED` + Circle public, sinon check de membership)
- Fetch le blob depuis Vercel Blob
- Stream la réponse avec headers :

```
Content-Type: <contentType>
Content-Disposition: attachment; filename="<filename>"; filename*=UTF-8''<encoded>
Content-Length: <sizeBytes>
```

- Encoder le filename pour supporter les caractères non-ASCII (RFC 5987)

### Cleanup des blobs

- **Suppression individuelle** : le usecase `RemoveMomentAttachment` supprime d'abord le blob via `StorageService.delete()` puis la ligne DB. Si la suppression blob échoue, la ligne DB reste (cohérence).
- **Suppression d'un Moment** : le cleanup blob ne se fait **pas** dans le usecase `DeleteMoment` mais dans la **server action** `deleteMomentAction` (convention du projet — cover image et avatar suivent le même pattern). Concrètement, `deleteMomentAction` doit : (1) charger les attachments du Moment, (2) supprimer les blobs un à un, puis (3) appeler le usecase `deleteMoment`.
- **Fuite existante à corriger en même temps** : `deleteMomentAction` ne supprime **pas** actuellement le blob du `coverImage` — cette feature est l'occasion de corriger cette fuite au passage. À signaler dans la PR.
- **Pas de GC des orphelins en V1** : si un blob se retrouve orphelin à cause d'un bug, il reste. Cron de garbage collection en V2 si ça devient un problème.

### Sécurité

- **Ownership** : vérifié dans les usecases (add/remove), jamais dans les server actions seules
- **Magic number check** : côté serveur via `file-type` pour éviter un PDF déguisé en `contentType: image/jpeg`. **Nouvelle dépendance à installer** : `pnpm add file-type`. C'est un niveau de sécurité **supérieur** à ce que fait aujourd'hui `processCoverImage()` (qui ne vérifie que le header MIME déclaré).
- **Taille** : re-vérifiée côté serveur après upload (le client peut mentir)
- **Rate limiting** : utilise le port `RateLimiter` existant (`domain/ports/services/rate-limiter.ts`) + son implémentation Prisma. **Première utilisation concrète de ce port** — le pattern mis en place ici sera à répliquer sur d'autres server actions (upload cover, upload avatar). Clé : `attachment-upload:${userId}`, limite : 10 uploads par minute.
- **XSS** : le filename est affiché côté client — React échappe par défaut, pas de `dangerouslySetInnerHTML` dans cette feature
- **Accessibilité liste** : la liste des attachments utilise `role="list"` et chaque carte `role="listitem"` (sémantique explicite car on utilise `<a>` cliquables, pas `<ul>/<li>`)
- **Ouverture de modale** : la modale `Dialog` shadcn gère le focus trap + Escape nativement
- **Liens externes** : attribut `rel="noopener noreferrer"` sur les `<a target="_blank">`

---

## Stratégie de tests

### Tests unitaires (Vitest, domain/)

- `add-moment-attachment.test.ts` :
  - Given moment exists + user is host + limit not reached + valid file → should create attachment
  - Given limit reached → should throw `AttachmentLimitReachedError`
  - Given file too large → should throw `AttachmentTooLargeError`
  - Given type not allowed → should throw `AttachmentTypeNotAllowedError`
  - Given user is not host → should throw `UnauthorizedError`
  - Given moment not found → should throw `MomentNotFoundError`
  - Spec by example (`test.each`) sur les types autorisés/refusés
  - Spec by example sur les tailles (limite exacte, juste au-dessus, juste en-dessous)

- `remove-moment-attachment.test.ts` :
  - Given user is host + attachment exists → should delete blob then DB row
  - Given attachment not found → should throw `AttachmentNotFoundError`
  - Given user is not host → should throw `UnauthorizedError`
  - Given storage delete fails → should NOT delete DB row (cohérence)

### Tests d'intégration (Vitest, infrastructure/)

- `prisma-moment-attachment-repository.test.ts` :
  - `create`, `findById`, `findByMoment` (ordre par `createdAt`), `countByMoment`, `delete`
  - Cascade on Moment delete (les lignes sont supprimées avec le Moment)

- `vercel-blob-storage.test.ts` :
  - Test avec un mock du client `@vercel/blob`, pas d'appel réseau réel

### Tests E2E (Playwright)

`tests/e2e/specs/moment-attachments.spec.ts` :

- **Parcours organisateur** :
  - Connexion → dashboard → éditer un événement → déplier "Options avancées"
  - Drag-and-drop d'un PDF → vérifier upload + affichage
  - Ajouter une 2e et 3e pièce jointe → vérifier compteur + bouton disparaît
  - Tenter d'ajouter un 4e fichier → message d'erreur limite atteinte
  - Tenter d'uploader un .docx → message d'erreur type
  - Supprimer une pièce jointe → confirmation → suppression

- **Parcours participant** :
  - Visite d'une page événement avec pièces jointes
  - Vérifier que la section "Documents" s'affiche avec les bonnes cartes
  - Clic sur un PDF → modale s'ouvre avec iframe
  - Bouton télécharger → déclenche le téléchargement
  - Clic sur une image → modale s'ouvre avec l'image
  - Escape ferme la modale
  - Visite d'une page événement sans pièce jointe → section absente

### Tests de sécurité (Vitest, dans les tests unitaires des usecases)

- Un Player non-Host ne peut pas upload d'attachment sur un Moment
- Un User d'un autre Circle ne peut pas upload
- Un User non authentifié → 401
- Upload d'un fichier avec `contentType` déclaré incorrect (PDF en `image/jpeg`) → rejeté par le magic number check

---

## Migration Prisma

```bash
pnpm db:push    # dev
pnpm db:push:prod # prod (avec confirmation)
```

**Pas de backfill nécessaire** — la table est nouvelle, le champ sur Moment est une relation inverse.

---

## i18n — Clés à ajouter

Le namespace `Moment` a déjà des sub-namespaces `form`, `public`, `detail`, `delete`, etc. Les clés de cette feature sont **réparties** dans les sub-namespaces existants selon leur usage, **pas dans un nouveau sub-namespace à la racine de ****`Moment`**.

### `Moment.form.attachments` — éditeur (formulaire organisateur)

```json
{
  "form": {
    "attachments": {
      "label": "Documents (optionnel)",
      "count": "{count}/{max} fichiers",
      "dropzoneTitle": "Glissez vos fichiers ici",
      "dropzoneSeparator": "ou",
      "dropzoneBrowse": "Parcourir",
      "dropzoneHint": "PDF, JPG, PNG, WEBP · Max {max} MB",
      "addMore": "Ajouter un document",
      "uploading": "Envoi en cours",
      "uploadError": "Erreur lors de l'envoi. Réessayer.",
      "errorTypeNotAllowed": "Format non supporté. PDF, JPG, PNG ou WEBP uniquement.",
      "errorTooLarge": "Fichier trop volumineux. Maximum {max} MB.",
      "errorLimitReached": "Vous avez atteint la limite de {max} documents.",
      "deleteConfirmTitle": "Supprimer ce document ?",
      "deleteConfirmDescription": "Cette action est irréversible.",
      "deleteConfirmAction": "Supprimer"
    }
  }
}
```

### `Moment.public.attachments` — affichage public (page événement)

```json
{
  "public": {
    "attachments": {
      "sectionTitle": "Documents",
      "viewerDownload": "Télécharger",
      "viewerClose": "Fermer"
    }
  }
}
```

Équivalent en anglais (mêmes clés, valeurs EN).

---

## Plan d'implémentation

| Phase | Contenu |
| --- | --- |
| **0** | `pnpm add file-type` — nouvelle dépendance pour le magic number check |
| **1** | Schema Prisma (`MomentAttachment` + relation sur `Moment`) + migration dev/prod |
| **2** | Domain : model, port repository, usecases `addMomentAttachment` / `removeMomentAttachment`, errors + tests unitaires (le port `StorageService` et l'adapter Vercel Blob existent déjà) |
| **3** | Infrastructure : `PrismaMomentAttachmentRepository` + tests d'intégration |
| **4** | Server actions : `uploadMomentAttachmentAction`, `deleteMomentAttachmentAction` + rate limiting via `RateLimiter` |
| **5** | Route API download : `/api/moments/[id]/attachments/[attachmentId]/download` avec visibility check et stream Content-Disposition |
| **6** | Composants : `AttachmentCard`, `AttachmentViewerDialog`, `MomentAttachmentsList` (intégration dans `MomentDetailView` entre description et participants) |
| **7** | Composant `MomentAttachmentsEditor` avec dropzone + intégration comme nouvelle rangée dans `MomentFormOptionsSection` (pattern identique à `price` et `capacity`) |
| **8** | i18n FR/EN dans les sub-namespaces `Moment.form.attachments` et `Moment.public.attachments` + tests E2E Playwright |
| **9** | Cleanup : ajout du cleanup attachments dans `deleteMomentAction` (server action) + fix de la fuite existante sur `coverImage` au passage |

Effort total estimé : **2-3 jours de dev concentré**.

---

## Hors scope V1 (évolutions futures)

- **Navigation prev/next** dans la modale entre documents
- **Réordonnancement manuel** par l'organisateur (drag-and-drop des cartes dans l'éditeur)
- **Plus de 3 fichiers** (augmenter la limite ou rendre configurable)
- **Autres types de fichiers** (docx, pptx, xlsx, markdown)
- **Attachements privés** (réservés aux inscrits)
- **Preview inline** pour les PDF (via pdf.js)
- **Lightbox avancée** pour les images (zoom, pan)
- **Garbage collection** des blobs orphelins
- **Quotas** par Circle / Organisateur
- **Attachements sur les Circles** (documents de présentation de la communauté)
- **Export des attachments** dans l'export CSV
- **Compression automatique** des images trop grosses (resize avant upload)
