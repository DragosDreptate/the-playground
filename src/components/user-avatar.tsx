import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  /**
   * Privé uniquement (Host dashboard, admin) — `email[0]` sert d'initiale
   * fallback. À ne PAS passer en contexte public ; sans `name` ni `email`
   * l'initiale tombe sur "?".
   */
  email?: string | null;
  image?: string | null;
  size?: "sm" | "default" | "md" | "lg" | "xl";
  /**
   * Dégradé de fond du fallback (initiales), calculé sur une graine non-PII
   * (`avatarGradientSeed` = `getMomentGradient(user.id)`). Fourni → mêmes couleurs
   * que les piles d'avatars ; absent → aplat `bg-primary/10` par défaut.
   */
  gradient?: string | null;
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

export function UserAvatar({ name, email, image, size = "default", gradient }: UserAvatarProps) {
  const initials = getInitials(name, email);

  return (
    <Avatar
      className={cn(
        size === "sm" && "size-7 text-xs",
        size === "default" && "size-8 text-sm",
        size === "md" && "size-10 text-base",
        size === "lg" && "size-16 text-xl",
        size === "xl" && "size-24 text-3xl",
      )}
    >
      {image && <AvatarImage src={image} alt={name ?? ""} referrerPolicy="no-referrer" />}
      <AvatarFallback
        className={cn(
          "font-medium",
          gradient ? "text-white" : "bg-primary/10 text-primary",
        )}
        style={gradient ? { background: gradient } : undefined}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
