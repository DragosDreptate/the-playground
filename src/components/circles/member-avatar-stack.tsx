import type { CircleMemberWithUser } from "@/domain/models/circle";
import { getPublicDisplayName, getPublicUserInitials } from "@/lib/display-name";
import { getMomentGradient } from "@/lib/gradient";

export function MemberAvatarStack({
  members,
  anonymousFallback,
}: {
  members: CircleMemberWithUser[];
  anonymousFallback: string;
}) {
  return (
    <span className="flex -space-x-1.5">
      {members.map((m) => {
        const displayName = getPublicDisplayName(m.user.firstName, m.user.lastName, anonymousFallback);
        return (
          <span key={m.id} className="group/avatar relative">
            <span
              className="ring-card relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.55rem] font-semibold text-white ring-2"
              style={{ background: getMomentGradient(m.user.email) }}
            >
              {m.user.image ? (
                <img
                  src={m.user.image}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                getPublicUserInitials(m.user)
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
