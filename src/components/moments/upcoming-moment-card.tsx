import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPin, Globe } from "lucide-react";
import type { RegistrationWithMoment } from "@/domain/models/registration";
import type { RegistrationStatus } from "@/domain/models/registration";

type UpcomingMomentCardProps = {
  registration: RegistrationWithMoment;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({
  status,
  t,
}: {
  status: RegistrationStatus;
  t: ReturnType<typeof useTranslations<"Dashboard">>;
}) {
  if (status === "WAITLISTED") {
    return <Badge variant="outline">{t("registrationStatus.waitlisted")}</Badge>;
  }
  return <Badge variant="secondary">{t("registrationStatus.registered")}</Badge>;
}

export function UpcomingMomentCard({ registration }: UpcomingMomentCardProps) {
  const t = useTranslations("Dashboard");
  const { moment } = registration;

  const locationLabel =
    moment.locationType === "ONLINE"
      ? t("online")
      : moment.locationType === "HYBRID"
        ? t("hybrid")
        : moment.locationName;

  const LocationIcon = moment.locationType === "IN_PERSON" ? MapPin : Globe;

  return (
    <Link href={`/m/${moment.slug}`}>
      <Card className="transition-colors hover:border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="truncate">{moment.title}</CardTitle>
              <div className="text-muted-foreground flex flex-col gap-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 shrink-0" />
                  {formatDate(moment.startsAt)}
                </span>
                {locationLabel && (
                  <span className="flex items-center gap-1.5">
                    <LocationIcon className="size-3.5 shrink-0" />
                    {locationLabel}
                  </span>
                )}
              </div>
              <CardDescription className="truncate">
                {moment.circleName}
              </CardDescription>
            </div>
            <StatusBadge status={registration.status} t={t} />
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
