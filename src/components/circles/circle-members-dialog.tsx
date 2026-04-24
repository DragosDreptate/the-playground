"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { RemoveMemberDialog } from "@/components/circles/remove-member-dialog";
import { Users as UsersIcon, Crown, MoreVertical, Star, ChevronDown, Trash2, Globe, Linkedin, Github, Download } from "lucide-react";
import { XIcon } from "@/components/icons/x-icon";
import { getDisplayName } from "@/lib/display-name";
import { generateSlug } from "@/lib/slug";
import {
  getCircleMembersPageAction,
  promoteToCoHostAction,
  demoteFromCoHostAction,
  exportCircleMembersAction,
} from "@/app/actions/circle";
import type {
  CircleMemberRole,
  CircleMemberWithUser,
} from "@/domain/models/circle";

const PAGE_SIZE = 20;

type Props = {
  circleId: string;
  initialMembers: CircleMemberWithUser[];
  initialTotal: number;
  initialHasMore: boolean;
  /** Rôle de l'utilisateur connecté dans ce Circle (active les actions de gestion). */
  callerRole?: CircleMemberRole;
  /** Afficher l'email des membres (dashboard Organisateur). */
  showEmails?: boolean;
  /** Nom du Circle (utilisé comme meta row dans l'export CSV). */
  circleName?: string;
  /** Slug du Circle (nom du fichier CSV). */
  circleSlug?: string;
  /** Classes CSS appliquées au bouton trigger rendu par DialogTrigger. */
  triggerClassName?: string;
  /** Contenu du trigger (texte, avatars+texte, etc.) — DialogTrigger rend lui-même le <button> wrappant. */
  children: React.ReactNode;
};

export function CircleMembersDialog({
  circleId,
  initialMembers,
  initialTotal,
  initialHasMore,
  callerRole,
  showEmails = false,
  circleName,
  circleSlug,
  triggerClassName,
  children,
}: Props) {
  const t = useTranslations("Circle");
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<CircleMemberWithUser[]>(initialMembers);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, startLoad] = useTransition();
  const [isExporting, startExport] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canExport = callerRole === "HOST" || callerRole === "CO_HOST";

  function handleExportCsv() {
    startExport(async () => {
      const result = await exportCircleMembersAction(circleId);
      if (!result.success) {
        toast.error(t("membersExport.error"));
        return;
      }
      const headers = [
        t("membersExport.csvHeaders.circleName"),
        t("membersExport.csvHeaders.firstName"),
        t("membersExport.csvHeaders.lastName"),
        t("membersExport.csvHeaders.email"),
        t("membersExport.csvHeaders.role"),
        t("membersExport.csvHeaders.joinedAt"),
      ];
      const name = circleName ?? "";
      const metaRow = [name, ...Array(headers.length - 1).fill("")];
      const rows = result.data.map((m) => [
        name,
        m.user.firstName ?? "",
        m.user.lastName ?? "",
        m.user.email,
        t(
          `membersExport.roleLabels.${
            m.role === "HOST" ? "host" : m.role === "CO_HOST" ? "coHost" : "player"
          }`,
        ),
        new Date(m.joinedAt).toISOString().slice(0, 10),
      ]);
      const csv = [metaRow, headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      const slug = circleSlug ?? (name ? generateSlug(name).slice(0, 50) : "circle");
      a.download = `members-${slug}-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Reset les données à la fermeture pour repartir propre à la prochaine ouverture
  useEffect(() => {
    if (!open) {
      setMembers(initialMembers);
      setTotal(initialTotal);
      setHasMore(initialHasMore);
    }
  }, [open, initialMembers, initialTotal, initialHasMore]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    const currentOffset = members.length;
    startLoad(async () => {
      const result = await getCircleMembersPageAction(circleId, currentOffset, PAGE_SIZE);
      setMembers((prev) => [...prev, ...result.members]);
      setHasMore(result.hasMore);
    });
  }, [circleId, members.length, hasMore, isLoading]);

  const handleMemberRemoved = useCallback((userId: string) => {
    setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  const handleMemberRoleChanged = useCallback((userId: string, role: CircleMemberRole) => {
    setMembers((prev) => prev.map((m) => (m.user.id === userId ? { ...m, role } : m)));
  }, []);

  useEffect(() => {
    if (!open || !hasMore || !sentinelRef.current) return;
    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "120px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasMore, loadMore]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className={triggerClassName}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-border flex-row items-center gap-3 space-y-0 border-b p-6">
          <div className="bg-primary/10 flex size-14 shrink-0 items-center justify-center rounded-full">
            <UsersIcon className="text-primary size-7" />
          </div>
          <DialogTitle className="min-w-0 flex-1 text-xl font-bold">
            {t("detail.memberCount", { count: total })}
          </DialogTitle>
          {canExport && total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="shrink-0"
            >
              <Download className="size-3.5" />
              {t("membersExport.action")}
            </Button>
          )}
          <DialogDescription className="sr-only">
            {t("detail.members")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6">
          <ul className="divide-border divide-y">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                callerRole={callerRole}
                showEmail={showEmails}
                circleId={circleId}
                onRemoved={handleMemberRemoved}
                onRoleChanged={handleMemberRoleChanged}
              />
            ))}
          </ul>
          {hasMore && (
            <div ref={sentinelRef} className="text-muted-foreground py-4 text-center text-xs">
              {isLoading ? "…" : ""}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type MemberRowProps = {
  member: CircleMemberWithUser;
  callerRole: CircleMemberRole | undefined;
  showEmail: boolean;
  circleId: string;
  onRemoved: (userId: string) => void;
  onRoleChanged: (userId: string, role: CircleMemberRole) => void;
};

function MemberRow({
  member,
  callerRole,
  showEmail,
  circleId,
  onRemoved,
  onRoleChanged,
}: MemberRowProps) {
  const t = useTranslations("Dashboard");
  const tCircle = useTranslations("Circle");
  const { user } = member;
  const displayName = getDisplayName(user.firstName, user.lastName, user.email);
  const router = useRouter();

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isManager = callerRole === "HOST" || callerRole === "CO_HOST";
  const canPromote =
    callerRole === "HOST" && member.role === "PLAYER" && member.status === "ACTIVE";
  const canDemote = callerRole === "HOST" && member.role === "CO_HOST";
  const canRemove =
    (callerRole === "HOST" && member.role !== "HOST") ||
    (callerRole === "CO_HOST" && member.role === "PLAYER");
  const hasMenuActions = canPromote || canDemote || canRemove;

  const handlePromote = () => {
    startTransition(async () => {
      const result = await promoteToCoHostAction(circleId, user.id);
      if (result.success) {
        toast.success(tCircle("promoteToCoHost.success", { name: displayName }));
        onRoleChanged(user.id, "CO_HOST");
        router.refresh();
      } else {
        toast.error(tCircle("promoteToCoHost.error"));
      }
    });
  };

  const handleDemote = () => {
    startTransition(async () => {
      const result = await demoteFromCoHostAction(circleId, user.id);
      if (result.success) {
        toast.success(tCircle("demoteFromCoHost.success", { name: displayName }));
        onRoleChanged(user.id, "PLAYER");
        router.refresh();
      } else {
        toast.error(tCircle("demoteFromCoHost.error"));
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 py-2.5">
        <Link
          href={`/u/${user.publicId}`}
          className="group/member flex min-w-0 flex-1 items-center gap-3"
        >
          <UserAvatar name={displayName} email={user.email} image={user.image} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm leading-snug font-medium group-hover/member:text-primary dark:group-hover/member:text-[oklch(0.76_0.27_341)] transition-colors">
                {displayName}
              </span>
              {(member.role === "HOST" || member.role === "CO_HOST") && (
                <span className="group/role relative shrink-0">
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary flex size-6 items-center justify-center p-0"
                  >
                    <Crown className="size-3" />
                  </Badge>
                  <span className="bg-foreground text-background pointer-events-none absolute top-full left-1/2 z-50 mt-1 -translate-x-1/2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity group-hover/role:opacity-100">
                    {t("role.host")}
                  </span>
                </span>
              )}
            </div>
            {showEmail && (
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            )}
          </div>
        </Link>

        <SocialLinks user={user} />

        {isManager && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 shrink-0 p-0"
                aria-label={tCircle("memberActions.label")}
                disabled={!hasMenuActions || isPending}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            {hasMenuActions && (
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
            )}
          </DropdownMenu>
        )}
      </div>

      {canRemove && (
        <RemoveMemberDialog
          circleId={circleId}
          userId={user.id}
          memberName={displayName}
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
          onRemoved={() => onRemoved(user.id)}
        />
      )}
    </>
  );
}

type SocialLinksProps = {
  user: CircleMemberWithUser["user"];
};

function SocialLinks({ user }: SocialLinksProps) {
  const links: Array<{ url: string; icon: React.ReactNode; title: string }> = [];
  if (user.website) links.push({ url: user.website, icon: <Globe className="size-3.5" />, title: "Site web" });
  if (user.linkedinUrl) links.push({ url: user.linkedinUrl, icon: <Linkedin className="size-3.5" />, title: "LinkedIn" });
  if (user.twitterUrl) links.push({ url: user.twitterUrl, icon: <XIcon className="size-3.5" />, title: "Twitter / X" });
  if (user.githubUrl) links.push({ url: user.githubUrl, icon: <Github className="size-3.5" />, title: "GitHub" });

  if (links.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          title={l.title}
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted"
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}
