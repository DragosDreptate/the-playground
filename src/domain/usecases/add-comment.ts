import type { Comment, CommentStatus } from "@/domain/models/comment";
import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { CommentAttachmentRepository } from "@/domain/ports/repositories/comment-attachment-repository";
import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { StorageService } from "@/domain/ports/services/storage-service";
import { isActiveOrganizer } from "@/domain/models/circle";
import { isNewAccount } from "@/lib/account-trust";
import {
  MAX_COMMENT_PHOTOS,
  MAX_COMMENT_PHOTO_SIZE_BYTES,
  ALLOWED_COMMENT_PHOTO_TYPES,
} from "@/domain/models/comment-attachment";
import {
  MomentNotFoundError,
  CommentContentEmptyError,
  CommentContentTooLongError,
  CommentPhotoLimitReachedError,
  CommentPhotoTooLargeError,
  CommentPhotoTypeNotAllowedError,
} from "@/domain/errors";
import { sanitizeFilename } from "@/lib/sanitize-filename";

const MAX_COMMENT_LENGTH = 2000;

export type CommentPhotoInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

type AddCommentInput = {
  momentId: string;
  userId: string;
  content: string;
  photos?: CommentPhotoInput[];
};

type AddCommentDeps = {
  commentRepository: CommentRepository;
  momentRepository: MomentRepository;
  userRepository: UserRepository;
  circleRepository: CircleRepository;
  registrationRepository?: RegistrationRepository;
  commentAttachmentRepository?: CommentAttachmentRepository;
  storage?: StorageService;
  /** Horloge injectée (déterminisme/tests) pour le gate « compte trop récent ». */
  now: Date;
};

type AddCommentResult = {
  comment: Comment;
  photoCount: number;
};

export async function addComment(
  input: AddCommentInput,
  deps: AddCommentDeps
): Promise<AddCommentResult> {
  const { commentRepository, momentRepository } = deps;

  const trimmed = input.content.trim();

  if (trimmed.length === 0) {
    throw new CommentContentEmptyError();
  }

  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new CommentContentTooLongError(MAX_COMMENT_LENGTH);
  }

  // Phase 1: validate ALL photos BEFORE any side-effect (DB/storage)
  const photos = input.photos ?? [];
  if (photos.length > 0) {
    if (photos.length > MAX_COMMENT_PHOTOS) {
      throw new CommentPhotoLimitReachedError(MAX_COMMENT_PHOTOS);
    }
    for (const photo of photos) {
      if (!ALLOWED_COMMENT_PHOTO_TYPES.has(photo.contentType)) {
        throw new CommentPhotoTypeNotAllowedError(photo.contentType);
      }
      if (photo.sizeBytes > MAX_COMMENT_PHOTO_SIZE_BYTES) {
        throw new CommentPhotoTooLargeError(MAX_COMMENT_PHOTO_SIZE_BYTES);
      }
    }
  }

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  // Block comments from users with PENDING_APPROVAL registration
  if (deps.registrationRepository) {
    const registration = await deps.registrationRepository.findByMomentAndUser(
      input.momentId,
      input.userId
    );
    if (registration?.status === "PENDING_APPROVAL") {
      throw new MomentNotFoundError(input.momentId);
    }
  }

  // Décision de statut : un commentaire d'un compte de moins de 24h passe en
  // file de validation (PENDING_REVIEW : invisible aux autres, non broadcasté)
  // SAUF si l'auteur est organisateur actif du Circle de l'événement (on ne
  // gate jamais quelqu'un sur sa propre Communauté). Fail-closed : auteur
  // introuvable → traité comme nouveau → mis en file.
  const [author, membership] = await Promise.all([
    deps.userRepository.findById(input.userId),
    deps.circleRepository.findMembership(moment.circleId, input.userId),
  ]);
  const isOrganizer = isActiveOrganizer(membership);
  const accountIsNew = !author || isNewAccount(author.createdAt, deps.now);
  const status: CommentStatus =
    !isOrganizer && accountIsNew ? "PENDING_REVIEW" : "PUBLISHED";

  // Phase 2: create comment, then upload photos
  const comment = await commentRepository.create({
    momentId: input.momentId,
    userId: input.userId,
    content: trimmed,
    status,
  });

  let uploadedCount = 0;
  if (
    photos.length > 0 &&
    deps.commentAttachmentRepository &&
    deps.storage
  ) {
    const { commentAttachmentRepository, storage } = deps;
    await Promise.all(
      photos.map(async (photo, i) => {
        const safeName = sanitizeFilename(photo.filename);
        const path = `comment-photos/${comment.id}-${Date.now()}-${i}-${safeName}`;
        const url = await storage.upload(
          path,
          photo.buffer,
          photo.contentType
        );
        await commentAttachmentRepository.create({
          commentId: comment.id,
          url,
          filename: photo.filename,
          contentType: photo.contentType,
          sizeBytes: photo.sizeBytes,
        });
      })
    );
    uploadedCount = photos.length;
  }

  return { comment, photoCount: uploadedCount };
}
