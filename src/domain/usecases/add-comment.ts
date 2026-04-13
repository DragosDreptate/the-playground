import type { Comment } from "@/domain/models/comment";
import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { CommentAttachmentRepository } from "@/domain/ports/repositories/comment-attachment-repository";
import type { StorageService } from "@/domain/ports/services/storage-service";
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
  registrationRepository?: RegistrationRepository;
  commentAttachmentRepository?: CommentAttachmentRepository;
  storage?: StorageService;
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

  // Phase 2: create comment, then upload photos
  const comment = await commentRepository.create({
    momentId: input.momentId,
    userId: input.userId,
    content: trimmed,
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
