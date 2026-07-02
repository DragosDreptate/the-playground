import type { RegistrationWithUser } from "@/domain/models/registration";
import { getPublicDisplayName, getPublicUserInitials } from "@/lib/display-name";
import { avatarGradientSeed } from "@/lib/avatar";

// Pendant de MemberAvatarStack côté Circle — domaines séparés car les types
// d'entrée diffèrent (Registration vs CircleMembership).
export function ParticipantAvatarStack({
  participants,
  anonymousFallback,
}: {
  participants: RegistrationWithUser[];
  anonymousFallback: string;
}) {
  return (
    <span className="flex -space-x-1.5">
      {participants.map((r) => {
        const displayName = getPublicDisplayName(r.user.firstName, r.user.lastName, anonymousFallback);
        return (
          <span key={r.id} className="group/avatar relative">
            <span
              className="ring-card relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.55rem] font-semibold text-white ring-2"
              style={{ background: avatarGradientSeed(r.user) }}
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
                getPublicUserInitials(r.user)
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
