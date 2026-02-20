import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Circle } from "@/domain/models/circle";

type CircleCardProps = {
  circle: Circle;
  href?: string;
};

export function CircleCard({ circle, href }: CircleCardProps) {
  const t = useTranslations("Common");

  return (
    <Link href={href ?? `/dashboard/circles/${circle.slug}`}>
      <Card className="transition-colors hover:border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{circle.name}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {circle.description}
              </CardDescription>
            </div>
            <Badge variant={circle.visibility === "PUBLIC" ? "default" : "secondary"}>
              {circle.visibility === "PUBLIC" ? t("public") : t("private")}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
