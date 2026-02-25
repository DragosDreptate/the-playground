import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/format-date";
import type { Moment } from "@/domain/models/moment";

type MomentCardProps = {
  moment: Moment;
  circleSlug: string;
};

const statusVariant = {
  PUBLISHED: "default",
  CANCELLED: "outline",
  PAST: "outline",
} as const;

const statusClassName = {
  PUBLISHED: "",
  CANCELLED: "border-destructive/40 text-destructive",
  PAST: "",
} as const;

export function MomentCard({ moment, circleSlug }: MomentCardProps) {
  const t = useTranslations("Moment");
  const locale = useLocale();

  return (
    <Link
      href={`/dashboard/circles/${circleSlug}/moments/${moment.slug}`}
    >
      <Card className="transition-colors hover:border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{moment.title}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {moment.description}
              </CardDescription>
              <p className="text-muted-foreground mt-2 text-xs">
                {formatShortDate(moment.startsAt, locale)}
              </p>
            </div>
            <Badge variant={statusVariant[moment.status]} className={statusClassName[moment.status]}>
              {t(`status.${moment.status.toLowerCase()}`)}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
