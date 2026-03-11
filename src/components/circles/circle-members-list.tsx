"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, MoreVertical } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { RemoveMemberDialog } from "@/components/circles/remove-member-dialog";
import { Link } from "@/i18n/navigation";
import { getDisplayName } from "@/lib/display-name";
import type { CircleMemberWithUser } from "@/domain/models/circle";

const PAGE_SIZE = 10;

type CircleMembersListProps = {
  hosts: CircleMemberWithUser[];
  players: CircleMemberWithUser[];
  variant?: "host" | "player" | "member-view";
  circleId?: string;
};

export function CircleMembersList({
  hosts,
  players,
  variant = "player",
  circleId,
}: CircleMembersListProps) {
  const t = useTranslations("Circle");
  const tCommon = useTranslations("Common");

  const allMembers = [
    ...hosts.map((m) => ({ ...m, isHost: true })),
    ...players.map((m) => ({ ...m, isHost: false })),
  ];
  const totalMembers = allMembers.length;

  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? allMembers : allMembers.slice(0, PAGE_SIZE);
  const hasMore = totalMembers > PAGE_SIZE;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("detail.members")}</h2>
        <Badge variant="outline">
          {t("detail.memberCount", { count: totalMembers })}
        </Badge>
      </div>

      <div className="divide-border divide-y">
        {displayed.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isHost={member.isHost}
            showEmail={variant === "host"}
            canRemove={variant === "host" && !member.isHost}
            circleId={circleId}
          />
        ))}
      </div>

      {hasMore && !showAll && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAll(true)}
        >
          {tCommon("showMore")} ({totalMembers - PAGE_SIZE})
        </Button>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isHost = false,
  showEmail = false,
  canRemove = false,
  circleId,
}: {
  member: CircleMemberWithUser;
  isHost?: boolean;
  showEmail?: boolean;
  canRemove?: boolean;
  circleId?: string;
}) {
  const t = useTranslations("Dashboard");
  const tRemove = useTranslations("Circle.removeMember");
  const { user } = member;
  const displayName = getDisplayName(user.firstName, user.lastName, user.email);

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 py-2.5">
        <UserAvatar
          name={displayName}
          email={user.email}
          image={user.image}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          {user.publicId ? (
            <Link
              href={`/u/${user.publicId}`}
              className="text-sm font-medium leading-snug hover:underline underline-offset-2"
            >
              {displayName}
            </Link>
          ) : (
            <p className="text-sm font-medium leading-snug">{displayName}</p>
          )}
          {showEmail && (
            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          )}
        </div>
        {isHost && (
          <Badge variant="outline" className="border-primary/40 text-primary shrink-0 gap-1">
            <Crown className="size-3" />
            {t("role.host")}
          </Badge>
        )}
        {canRemove && circleId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 shrink-0"
                aria-label={tRemove("action")}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={() => setDialogOpen(true)}
              >
                {tRemove("action")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {canRemove && circleId && (
        <RemoveMemberDialog
          circleId={circleId}
          userId={user.id}
          memberName={displayName}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
