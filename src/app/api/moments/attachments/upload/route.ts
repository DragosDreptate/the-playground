import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaMomentAttachmentRepository,
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { prismaRateLimiter } from "@/infrastructure/services/rate-limiter/prisma-rate-limiter";
import { authorizeMomentAttachmentUpload } from "@/domain/usecases/authorize-moment-attachment-upload";

const UPLOAD_RATE_LIMIT = { max: 10, windowMs: 60 * 1000 };

type AttachmentUploadPayload = {
  momentId: string;
  contentType: string;
};

/**
 * Client-direct upload token route. The file goes straight from the browser to
 * Vercel Blob (bypassing the 4.5 MB function body limit), so all authorization
 * happens here, before the token is issued. The DB row is created separately by
 * confirmMomentAttachmentAction (onUploadCompleted is intentionally omitted: it
 * cannot reach localhost, and we don't want a second write path).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error("Not authenticated");
        }
        const userId = session.user.id;

        if (!clientPayload) {
          throw new Error("Missing client payload");
        }
        const { momentId, contentType } = JSON.parse(
          clientPayload
        ) as AttachmentUploadPayload;

        // The blob path must be namespaced to the moment so a HOST can only
        // ever write under their own moment's prefix.
        if (!pathname.startsWith(`moment-attachments/${momentId}/`)) {
          throw new Error("Invalid upload path");
        }

        const rate = await prismaRateLimiter.checkLimit(
          `attachment-upload:${userId}`,
          UPLOAD_RATE_LIMIT.max,
          UPLOAD_RATE_LIMIT.windowMs
        );
        if (!rate.allowed) {
          throw new Error("Rate limited");
        }

        const { maxSizeBytes } = await authorizeMomentAttachmentUpload(
          { momentId, userId, contentType },
          {
            attachmentRepository: prismaMomentAttachmentRepository,
            momentRepository: prismaMomentRepository,
            circleRepository: prismaCircleRepository,
          }
        );

        return {
          allowedContentTypes: [contentType],
          maximumSizeInBytes: maxSizeBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ momentId, userId }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
