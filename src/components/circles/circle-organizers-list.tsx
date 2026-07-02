import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { avatarGradientSeed } from "@/lib/avatar";
import { ContactOrganizerLink } from "@/components/contact-organizer-link";
import { getPublicDisplayName } from "@/lib/display-name";
import type { CircleMemberWithUser } from "@/domain/models/circle";

type ContactOrganizerConfig = {
  circleId: string;
  senderEmail: string | null;
  signInUrl: string | null;
  /** Compte de moins de 24h : grise le lien "Contacter l'organisateur". */
  accountTooNew?: boolean;
};

type Props = {
  organizers: CircleMemberWithUser[];
  /** Rendre les noms cliquables vers le profil public. */
  linkable: boolean;
  /** Label de section, déjà traduit. */
  label: string;
  /** Étiquette pour un organisateur sans nom (`t("Common.anonymousFallback")`). */
  anonymousFallback: string;
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
export function CircleOrganizersList({ organizers, linkable, label, anonymousFallback, contactOrganizer }: Props) {
  if (organizers.length === 0) return null;

  return (
    <>
      <div className="space-y-2 px-1">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {label}
        </p>
        <ul className="space-y-2">
          {organizers.map((host) => {
            const hostDisplayName = getPublicDisplayName(host.user.firstName, host.user.lastName, anonymousFallback);
            const avatar = (
              <UserAvatar
                name={hostDisplayName}
                image={host.user.image}
                gradient={avatarGradientSeed(host.user)}
                size="sm"
              />
            );
            const showLink = linkable && host.user.publicId;
            return (
              <li key={host.id}>
                {showLink ? (
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
            accountTooNew={contactOrganizer.accountTooNew}
          />
        )}
      </div>
      <div className="border-border border-t" />
    </>
  );
}
