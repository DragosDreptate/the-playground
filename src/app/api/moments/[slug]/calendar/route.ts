import { NextResponse } from "next/server";
import {
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { generateIcs } from "@/infrastructure/services/email/generate-ics";
import { MomentNotFoundError } from "@/domain/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let moment;
  try {
    moment = await getMomentBySlug(slug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) {
      return new NextResponse("Not found", { status: 404 });
    }
    throw error;
  }

  if (moment.status === "CANCELLED") {
    return new NextResponse("Not found", { status: 404 });
  }

  const circle = await prismaCircleRepository.findById(moment.circleId);
  if (!circle) {
    return new NextResponse("Not found", { status: 404 });
  }

  const location =
    moment.locationType === "ONLINE"
      ? moment.videoLink ?? "En ligne"
      : [moment.locationName, moment.locationAddress].filter(Boolean).join(", ");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const ics = generateIcs({
    uid: moment.id,
    title: moment.title,
    description: moment.description,
    startsAt: moment.startsAt,
    endsAt: moment.endsAt,
    location,
    videoLink: moment.videoLink,
    url: `${appUrl}/m/${moment.slug}`,
    organizerName: circle.name,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
