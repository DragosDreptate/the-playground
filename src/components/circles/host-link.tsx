import { Link } from "@/i18n/navigation";
import { getPublicDisplayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";

type HostUser = {
  id: string;
  publicId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

type Props = {
  user: HostUser;
  /** Étiquette pour un Host sans nom (typiquement `t("Common.anonymousFallback")`). */
  anonymousFallback: string;
  /** Classes CSS appliquées au lien et au fallback <span> */
  className?: string;
  /** Désactive le lien (ex: visiteur non connecté sur page publique) */
  linkDisabled?: boolean;
};

export function HostLink({ user, anonymousFallback, className, linkDisabled }: Props) {
  const name = getPublicDisplayName(user.firstName, user.lastName, anonymousFallback);
  if (!linkDisabled && user.publicId) {
    return (
      <Link
        href={`/u/${user.publicId}`}
        className={cn("hover:text-primary dark:hover:text-[oklch(0.76_0.27_341)] transition-colors", className)}
      >
        {name}
      </Link>
    );
  }
  return className ? <span className={className}>{name}</span> : <>{name}</>;
}
