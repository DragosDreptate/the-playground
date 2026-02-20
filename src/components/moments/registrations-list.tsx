import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getMomentGradient } from "@/lib/gradient";
import type { RegistrationWithUser } from "@/domain/models/registration";

type RegistrationsListProps = {
  registrations: RegistrationWithUser[];
  registeredCount: number;
  waitlistedCount: number;
  capacity: number | null;
  variant?: "host" | "public";
};

function getInitials(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName[0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function getDisplayName(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  return email;
}

export function RegistrationsList({
  registrations,
  registeredCount,
  waitlistedCount,
  capacity,
  variant = "host",
}: RegistrationsListProps) {
  const t = useTranslations("Moment");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("registrations.title")}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">
            {t("registrations.registered", { count: registeredCount })}
          </Badge>
          {waitlistedCount > 0 && (
            <Badge variant="secondary">
              {t("registrations.waitlisted", { count: waitlistedCount })}
            </Badge>
          )}
          {capacity !== null && (
            <Badge variant="outline">
              {t("registrations.capacity", { count: capacity })}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {registrations.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          {t("registrations.empty")}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {registrations.map((reg) => (
            <div
              key={reg.id}
              className="flex items-center gap-2"
            >
              {reg.user.image ? (
                <img
                  src={reg.user.image}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: getMomentGradient(reg.user.email) }}
                >
                  {getInitials(
                    reg.user.firstName,
                    reg.user.lastName,
                    reg.user.email
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm">
                  {getDisplayName(
                    reg.user.firstName,
                    reg.user.lastName,
                    reg.user.email
                  )}
                </p>
                {variant === "host" && (
                  <p className="text-muted-foreground truncate text-xs">
                    {reg.user.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
