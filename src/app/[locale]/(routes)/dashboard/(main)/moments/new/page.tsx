import { auth } from "@/infrastructure/auth/auth.config";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getUserCircles } from "@/domain/usecases/get-user-circles";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CircleCard } from "@/components/circles/circle-card";
import { ChevronRight } from "lucide-react";

export default async function NewMomentPage() {
  const session = await auth();
  const t = await getTranslations("Dashboard");

  if (!session?.user?.id) {
    return null;
  }

  const circles = await getUserCircles(session.user.id, {
    circleRepository: prismaCircleRepository,
  });

  if (circles.length === 1) {
    redirect(`/dashboard/circles/${circles[0].slug}/moments/new`);
  }

  const breadcrumb = (
    <div className="text-muted-foreground flex items-center gap-1 text-sm">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        {t("title")}
      </Link>
      <ChevronRight className="size-3.5" />
      <span className="text-foreground truncate font-medium">
        {t("createMoment")}
      </span>
    </div>
  );

  if (circles.length === 0) {
    return (
      <div className="space-y-6">
        {breadcrumb}
        <h1 className="text-2xl font-bold tracking-tight">
          {t("selectCircle.title")}
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <h2 className="text-lg font-medium">{t("noCircles.title")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("noCircles.description")}
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/circles/new">{t("createCircle")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {breadcrumb}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("selectCircle.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("selectCircle.description")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {circles.map((circle) => (
          <CircleCard
            key={circle.id}
            circle={circle}
            href={`/dashboard/circles/${circle.slug}/moments/new`}
          />
        ))}
      </div>
    </div>
  );
}
