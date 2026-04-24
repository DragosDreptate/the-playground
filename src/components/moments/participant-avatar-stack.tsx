import type { RegistrationWithUser } from "@/domain/models/registration";
import { getDisplayName, getCircleUserInitials } from "@/lib/display-name";
import { getMomentGradient } from "@/lib/gradient";

/**
 * Rangée d'avatars d'inscrits superposés avec tooltip au survol.
 * Utilisée sur la page Moment (publique + dashboard) dans la section Participants.
 * Pendant très similaire à MemberAvatarStack côté Circle — les domaines restent séparés
 * car le type d'entrée diffère (Registration vs CircleMembership).
 */
export function ParticipantAvatarStack({
  participants,
}: {
  participants: RegistrationWithUser[];
}) {
  return (
    <span className="flex -space-x-1.5">
      {participants.map((r) => {
        const displayName = getDisplayName(r.user.firstName, r.user.lastName, r.user.email);
        return (
          <span key={r.id} className="group/avatar relative">
            <span
              className="ring-card relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.55rem] font-semibold text-white ring-2"
              style={{ background: getMomentGradient(r.user.email) }}
            >
              {r.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.user.image}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                getCircleUserInitials(r.user)
              )}
            </span>
            <span className="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity group-hover/avatar:opacity-100">
              {displayName}
            </span>
          </span>
        );
      })}
    </span>
  );
}
