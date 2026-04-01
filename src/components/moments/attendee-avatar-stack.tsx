import { getCircleUserInitials } from "@/lib/display-name";
import { getMomentGradient } from "@/lib/gradient";

export type Attendee = {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  };
};

type Props = {
  attendees: Attendee[];
  totalCount: number;
  label: string;
  maxAvatars?: number;
};

export function AttendeeAvatarStack({
  attendees,
  totalCount,
  label,
  maxAvatars = 3,
}: Props) {
  if (totalCount === 0) return null;

  const visible = attendees.slice(0, maxAvatars);

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {visible.map((a, i) => {
          const initials = getCircleUserInitials(a.user);
          const gradient = getMomentGradient(a.user.email);
          return (
            <div
              key={i}
              className="ring-card flex size-[22px] shrink-0 items-center justify-center rounded-full text-[0.55rem] font-semibold text-white ring-2"
              style={
                a.user.image
                  ? {
                      backgroundImage: `url(${a.user.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : { background: gradient }
              }
            >
              {!a.user.image && initials}
            </div>
          );
        })}
      </div>
      <span className="text-muted-foreground ml-1.5 text-xs whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
