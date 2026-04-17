"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, MoreVertical, ChevronDown, Star, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { RemoveMemberDialog } from "@/components/circles/remove-member-dialog";
import { Link } from "@/i18n/navigation";
import { getDisplayName } from "@/lib/display-name";
import type {
  CircleMemberRole,
  CircleMemberWithUser,
} from "@/domain/models/circle";
import {
  promoteToCoHostAction,
  demoteFromCoHostAction,
} from "@/app/actions/circle";

const PAGE_SIZE = 10;

type CircleMembersListProps = {
  hosts: CircleMemberWithUser[];
  players: CircleMemberWithUser[];
  variant?: "host" | "player" | "member-view";
  /** Rôle de l'utilisateur connecté dans ce Circle — déclenche l'affichage des actions de gestion. */
  callerRole?: CircleMemberRole;
  circleId?: string;
};

export function CircleMembersList({
  hosts,
  players,
  variant = "player",
  callerRole,
  circleId,
}: CircleMembersListProps) {
  const t = useTranslations("Circle");
  const tCommon = useTranslations("Common");

  const allMembers = [...hosts, ...players];
  const totalMembers = allMembers.length;

  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? allMembers : allMembers.slice(0, PAGE_SIZE);
  const hasMore = totalMembers > PAGE_SIZE;

  const isDashboardOrganizer = variant === "host";

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
            callerRole={callerRole}
            showEmail={isDashboardOrganizer}
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

type MemberRowProps = {
  member: CircleMemberWithUser;
  callerRole: CircleMemberRole | undefined;
  showEmail: boolean;
  circleId: string | undefined;
};

function MemberRow({
  member,
  callerRole,
  showEmail,
  circleId,
}: MemberRowProps) {
  const t = useTranslations("Dashboard");
  const tCircle = useTranslations("Circle");
  const { user } = member;
  const displayName = getDisplayName(user.firstName, user.lastName, user.email);
  const router = useRouter();

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Matrice d'actions (D10, D11, D22)
  const canPromote =
    circleId !== undefined &&
    callerRole === "HOST" &&
    member.role === "PLAYER" &&
    member.status === "ACTIVE";
  const canDemote =
    circleId !== undefined &&
    callerRole === "HOST" &&
    member.role === "CO_HOST";
  const canRemove =
    circleId !== undefined &&
    ((callerRole === "HOST" && member.role !== "HOST") ||
      (callerRole === "CO_HOST" && member.role === "PLAYER"));
  const hasMenuActions = canPromote || canDemote || canRemove;

  const handlePromote = () => {
    if (!circleId) return;
    startTransition(async () => {
      const result = await promoteToCoHostAction(circleId, user.id);
      if (result.success) {
        toast.success(tCircle("promoteToCoHost.success", { name: displayName }));
        router.refresh();
      } else {
        toast.error(tCircle("promoteToCoHost.error"));
      }
    });
  };

  const handleDemote = () => {
    if (!circleId) return;
    startTransition(async () => {
      const result = await demoteFromCoHostAction(circleId, user.id);
      if (result.success) {
        toast.success(tCircle("demoteFromCoHost.success", { name: displayName }));
        router.refresh();
      } else {
        toast.error(tCircle("demoteFromCoHost.error"));
      }
    });
  };

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

        <MemberBadge role={member.role} />

        {hasMenuActions && circleId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 shrink-0"
                aria-label={tCircle("memberActions.label")}
                disabled={isPending}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canPromote && (
                <DropdownMenuItem
                  className="focus:bg-muted focus:text-foreground"
                  onSelect={handlePromote}
                >
                  <Star className="size-4" />
                  {tCircle("promoteToCoHost.action")}
                </DropdownMenuItem>
              )}
              {canDemote && (
                <DropdownMenuItem
                  className="focus:bg-muted focus:text-foreground"
                  onSelect={handleDemote}
                >
                  <ChevronDown className="size-4" />
                  {tCircle("demoteFromCoHost.action")}
                </DropdownMenuItem>
              )}
              {(canPromote || canDemote) && canRemove && <DropdownMenuSeparator />}
              {canRemove && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-muted"
                  onSelect={() => setRemoveDialogOpen(true)}
                >
                  <Trash2 className="size-4" />
                  {tCircle("removeMember.action")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {canRemove && circleId && (
        <RemoveMemberDialog
          circleId={circleId}
          userId={user.id}
          memberName={displayName}
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
        />
      )}
    </>
  );
}

function MemberBadge({ role }: { role: CircleMemberRole }) {
  const t = useTranslations("Dashboard");
  if (role === "PLAYER") return null;
  return (
    <Badge variant="outline" className="border-primary/40 text-primary shrink-0 gap-1">
      <Crown className="size-3" />
      {t("role.host")}
    </Badge>
  );
}
