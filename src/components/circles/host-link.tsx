import { Link } from "@/i18n/navigation";
import { getDisplayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";

type HostUser = {
  id: string;
  publicId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

type Props = {
  user: HostUser;
  /** Classes CSS appliquées au lien et au fallback <span> */
  className?: string;
  /** Désactive le lien (ex: visiteur non connecté sur page publique) */
  linkDisabled?: boolean;
};

export function HostLink({ user, className, linkDisabled }: Props) {
  const name = getDisplayName(user.firstName, user.lastName, user.email);
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
