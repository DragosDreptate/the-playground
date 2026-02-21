import { getMomentGradient } from "@/lib/gradient";

type CircleAvatarProps = {
  name: string;
  image?: string | null;
  size?: "xs" | "sm" | "default";
};

const sizeClasses = {
  xs: "size-4 text-[8px]",
  sm: "size-6 text-[10px]",
  default: "size-9 text-sm",
} as const;

export function CircleAvatar({ name, image, size = "default" }: CircleAvatarProps) {
  const gradient = getMomentGradient(name);
  const initial = name.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={`${sizeClasses[size]} shrink-0 rounded-full flex items-center justify-center font-semibold text-white`}
      style={{
        background: image ? undefined : gradient,
        backgroundImage: image ? `url(${image})` : undefined,
        backgroundSize: image ? "cover" : undefined,
      }}
    >
      {!image && initial}
    </div>
  );
}
