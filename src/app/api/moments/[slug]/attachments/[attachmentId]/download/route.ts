import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaMomentRepository,
  prismaMomentAttachmentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";

/**
 * Why a route and not a server action: we stream the blob with a
 * Content-Disposition header to force a real download, which isn't
 * possible from a server action.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; attachmentId: string }> }
) {
  const { slug, attachmentId } = await params;

  try {
    const [moment, attachment] = await Promise.all([
      prismaMomentRepository.findBySlug(slug),
      prismaMomentAttachmentRepository.findById(attachmentId),
    ]);

    if (!moment || moment.status === "CANCELLED") {
      return new NextResponse("Not found", { status: 404 });
    }
    if (!attachment || attachment.momentId !== moment.id) {
      return new NextResponse("Not found", { status: 404 });
    }

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

    const blobResponse = await fetch(attachment.url);
    if (!blobResponse.ok || !blobResponse.body) {
      Sentry.captureMessage(
        `Failed to fetch blob for attachment ${attachmentId}: ${blobResponse.status}`
      );
      return new NextResponse("Not found", { status: 404 });
    }

    // RFC 5987: filename* supports non-ASCII, filename is the ASCII fallback
    const asciiFilename = attachment.filename.replace(/[^\x20-\x7e]/g, "_");
    const encodedFilename = encodeURIComponent(attachment.filename);
    const contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;

    return new NextResponse(blobResponse.body, {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": contentDisposition,
        "Content-Length": String(attachment.sizeBytes),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    Sentry.captureException(err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
