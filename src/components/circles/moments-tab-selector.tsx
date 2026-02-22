import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

type Props = {
  activeTab: "upcoming" | "past";
  isHost: boolean;
  circleSlug: string;
};

export async function MomentsTabSelector({ activeTab, isHost, circleSlug }: Props) {
  const t = await getTranslations("Circle");
  const tMoment = await getTranslations("Moment");

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="flex items-center gap-1 rounded-full border p-1">
        <Link
          href="?tab=upcoming"
          className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
            activeTab === "upcoming"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("detail.upcomingMoments")}
        </Link>
        <Link
          href="?tab=past"
          className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
            activeTab === "past"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("detail.pastMoments")}
        </Link>
      </div>

      {isHost && activeTab === "upcoming" && (
        <Button asChild size="sm" className="w-full md:w-auto">
          <Link href={`/dashboard/circles/${circleSlug}/moments/new`}>
            {tMoment("create.title")}
          </Link>
        </Button>
      )}
    </div>
  );
}
