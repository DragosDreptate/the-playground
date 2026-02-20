import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  email: string;
  image?: string | null;
  size?: "sm" | "default";
};

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

export function UserAvatar({ name, email, image, size = "default" }: UserAvatarProps) {
  const initials = getInitials(name, email);

  return (
    <Avatar
      className={cn(
        size === "sm" && "h-7 w-7 text-xs",
        size === "default" && "h-8 w-8 text-sm",
      )}
    >
      {image && <AvatarImage src={image} alt={name ?? email} />}
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
