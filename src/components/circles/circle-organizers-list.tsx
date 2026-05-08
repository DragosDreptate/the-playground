import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { ContactOrganizerLink } from "@/components/contact-organizer-link";
import { getDisplayName } from "@/lib/display-name";
import type { CircleMemberWithUser } from "@/domain/models/circle";

type ContactOrganizerConfig = {
  circleId: string;
  senderEmail: string | null;
  /** Non-null = visiteur non auth → le lien redirige vers signin. */
  signInUrl: string | null;
};

type Props = {
  organizers: CircleMemberWithUser[];
  /** Rendre les noms cliquables vers le profil public. */
  linkable: boolean;
  /** Label de section, déjà traduit. */
  label: string;
  /**
   * Si fourni, affiche un lien discret "Contacter l'organisateur" sous la liste.
   * À ne PAS passer si le visiteur est lui-même organisateur du Circle.
   */
  contactOrganizer?: ContactOrganizerConfig;
};

/**
 * Bloc "Organisé par" de la colonne gauche des pages Circle (publique + dashboard).
 * Liste les organisateurs triés (HOST puis CO_HOST) avec avatar + nom.
 */
export function CircleOrganizersList({ organizers, linkable, label, contactOrganizer }: Props) {
  if (organizers.length === 0) return null;

  return (
    <>
      <div className="space-y-2 px-1">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {label}
        </p>
        <ul className="space-y-2">
          {organizers.map((host) => {
            const hostDisplayName = getDisplayName(host.user.firstName, host.user.lastName, host.user.email);
            const avatar = (
              <UserAvatar
                name={hostDisplayName}
                email={host.user.email}
                image={host.user.image}
                size="sm"
              />
            );
            return (
              <li key={host.id}>
                {linkable ? (
                  <Link
                    href={`/u/${host.user.publicId}`}
                    className="group/organizer flex items-center gap-3"
                  >
                    {avatar}
                    <span className="text-sm font-medium leading-snug group-hover/organizer:text-primary dark:group-hover/organizer:text-[oklch(0.76_0.27_341)] transition-colors">
                      {hostDisplayName}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    {avatar}
                    <span className="text-sm font-medium leading-snug">{hostDisplayName}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {contactOrganizer && (
          <ContactOrganizerLink
            circleId={contactOrganizer.circleId}
            senderEmail={contactOrganizer.senderEmail}
            signInUrl={contactOrganizer.signInUrl}
            variant="circle"
          />
        )}
      </div>
      <div className="border-border border-t" />
    </>
  );
}
