import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Moment } from "@/domain/models/moment";

type MomentCardProps = {
  moment: Moment;
  circleSlug: string;
};

const statusVariant = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  CANCELLED: "destructive",
  PAST: "outline",
} as const;

export function MomentCard({ moment, circleSlug }: MomentCardProps) {
  const t = useTranslations("Moment");

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
                {moment.startsAt.toLocaleDateString()}
              </p>
            </div>
            <Badge variant={statusVariant[moment.status]}>
              {t(`status.${moment.status.toLowerCase()}`)}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
