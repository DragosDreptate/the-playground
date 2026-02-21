"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Crown } from "lucide-react";
import { getMomentGradient } from "@/lib/gradient";
import type { CircleMemberWithUser } from "@/domain/models/circle";

type CircleMembersListProps = {
  hosts: CircleMemberWithUser[];
  players: CircleMemberWithUser[];
  variant?: "host" | "player";
};

function getInitials(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName)
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  return email[0].toUpperCase();
}

function getDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email;
}

export function CircleMembersList({
  hosts,
  players,
  variant = "player",
}: CircleMembersListProps) {
  const t = useTranslations("Circle");

  const totalMembers = hosts.length + players.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("detail.members")}</h2>
        <Badge variant="outline">
          {t("detail.memberCount", { count: totalMembers })}
        </Badge>
      </div>

      <Separator />

      <div className="flex flex-wrap gap-3">
        {/* Hosts first */}
        {hosts.map((member) => (
          <MemberItem key={member.id} member={member} isHost showEmail={variant === "host"} />
        ))}
        {/* Then players */}
        {players.map((member) => (
          <MemberItem key={member.id} member={member} showEmail={variant === "host"} />
        ))}
      </div>
    </div>
  );
}

function MemberItem({
  member,
  isHost = false,
  showEmail = false,
}: {
  member: CircleMemberWithUser;
  isHost?: boolean;
  showEmail?: boolean;
}) {
  const { user } = member;

  return (
    <div className="flex items-center gap-2">
      {user.image ? (
        <img
          src={user.image}
          alt=""
          className="size-8 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: getMomentGradient(user.email) }}
        >
          {getInitials(user.firstName, user.lastName, user.email)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm">
          {getDisplayName(user.firstName, user.lastName, user.email)}
        </p>
        {showEmail && (
          <p className="text-muted-foreground truncate text-xs">
            {user.email}
          </p>
        )}
      </div>
      {isHost && <Crown className="text-primary size-3.5 shrink-0" />}
    </div>
  );
}
