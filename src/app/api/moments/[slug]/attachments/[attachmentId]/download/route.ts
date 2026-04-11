import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaMomentRepository,
  prismaMomentAttachmentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";

/**
 * GET /api/moments/[slug]/attachments/[attachmentId]/download
 *
 * Proxies an attachment blob and forces a download via Content-Disposition.
 *
 * Visibility rules (same as the public moment page):
 * - Moment must exist and not be CANCELLED
 * - If the Circle is PUBLIC: anyone can download
 * - If the Circle is PRIVATE: only ACTIVE members of the Circle can download
 *
 * Why this is a route API (and not a server action):
 * We need to return a binary stream with a Content-Disposition header.
 * Server actions can't set response headers or stream binary content.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; attachmentId: string }> }
) {
  const { slug, attachmentId } = await params;

  try {
    // 1. Resolve the moment by slug
    const moment = await prismaMomentRepository.findBySlug(slug);
    if (!moment || moment.status === "CANCELLED") {
      return new NextResponse("Not found", { status: 404 });
    }

    // 2. Resolve the attachment and check it belongs to this moment
    const attachment = await prismaMomentAttachmentRepository.findById(attachmentId);
    if (!attachment || attachment.momentId !== moment.id) {
      return new NextResponse("Not found", { status: 404 });
    }

    // 3. Visibility check — same rules as the public moment page
    const circle = await prismaCircleRepository.findById(moment.circleId);
    if (!circle) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (circle.visibility === "PRIVATE") {
      const session = await auth();
      if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      const membership = await prismaCircleRepository.findMembership(
        circle.id,
        session.user.id
      );
      if (!membership || membership.status !== "ACTIVE") {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // 4. Fetch the blob from Vercel Blob
    const blobResponse = await fetch(attachment.url);
    if (!blobResponse.ok || !blobResponse.body) {
      Sentry.captureMessage(
        `Failed to fetch blob for attachment ${attachmentId}: ${blobResponse.status}`
      );
      return new NextResponse("Not found", { status: 404 });
    }

    // 5. Stream the response with a Content-Disposition header that forces download.
    //    RFC 5987 filename* parameter supports non-ASCII characters.
    const asciiFilename = attachment.filename.replace(/[^\x20-\x7e]/g, "_");
    const encodedFilename = encodeURIComponent(attachment.filename);
    const contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;

    return new NextResponse(blobResponse.body, {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": contentDisposition,
        "Content-Length": String(attachment.sizeBytes),
        // Prevent intermediary caches from serving stale content to wrong users.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    Sentry.captureException(err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
