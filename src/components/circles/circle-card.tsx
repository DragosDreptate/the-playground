import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Lock } from "lucide-react";
import type { Circle, CircleMemberRole } from "@/domain/models/circle";

type CircleCardProps = {
  circle: Circle;
  href?: string;
  role?: CircleMemberRole;
};

export function CircleCard({ circle, href, role }: CircleCardProps) {
  const t = useTranslations("Common");
  const tDashboard = useTranslations("Dashboard");

  const VisibilityIcon = circle.visibility === "PUBLIC" ? Globe : Lock;
  const visibilityLabel = circle.visibility === "PUBLIC" ? t("public") : t("private");

  return (
    <Link href={href ?? `/dashboard/circles/${circle.slug}`}>
      <Card className="transition-colors hover:border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{circle.name}</CardTitle>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <VisibilityIcon className="size-3 shrink-0" />
                {visibilityLabel}
              </p>
              {circle.description && (
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                  {circle.description}
                </p>
              )}
            </div>
            {role && (
              <Badge variant={role === "HOST" ? "default" : "outline"} className="shrink-0">
                {role === "HOST" ? tDashboard("role.host") : tDashboard("role.player")}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
