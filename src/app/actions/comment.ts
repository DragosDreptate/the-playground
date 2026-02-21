"use server";

import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCommentRepository,
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { addComment } from "@/domain/usecases/add-comment";
import { deleteComment } from "@/domain/usecases/delete-comment";
import { DomainError } from "@/domain/errors";
import type { Comment } from "@/domain/models/comment";
import type { ActionResult } from "./types";

export async function addCommentAction(
  momentId: string,
  content: string
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    const result = await addComment(
      { momentId, userId: session.user.id, content },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
      }
    );
    return { success: true, data: result.comment };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}

export async function deleteCommentAction(
  commentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  try {
    await deleteComment(
      { commentId, userId: session.user.id },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
      }
    );
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}
