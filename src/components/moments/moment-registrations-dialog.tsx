"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users as UsersIcon, Crown, Clock, Download, Trash2, MoreVertical, Globe, Linkedin, Github } from "lucide-react";
import { XIcon } from "@/components/icons/x-icon";
import { getDisplayName } from "@/lib/display-name";
import { generateSlug } from "@/lib/slug";
import { getMomentParticipantsPageAction } from "@/app/actions/moment";
import { RemoveRegistrationDialog } from "@/components/moments/remove-registration-dialog";
import type { RegistrationWithUser } from "@/domain/models/registration";

const PAGE_SIZE = 20;

type Props = {
  momentId: string;
  initialParticipants: RegistrationWithUser[];
  initialTotal: number;
  initialHasMore: boolean;
  /** Capacité maximale du Moment (null = illimité → pas d'info places). */
  capacity: number | null;
  /** user.id des Organisateurs du Circle (HOST + CO_HOST) pour afficher le badge Crown. */
  hostUserIds: string[];
  /** Participants en liste d'attente, affichés dans une section dédiée. */
  waitlistedRegistrations: RegistrationWithUser[];
  /** Liste complète REGISTERED + WAITLISTED pour l'export CSV (host only). */
  allRegistrationsForExport: RegistrationWithUser[];
  /** Vue organisateur : active export CSV + bouton Retirer par ligne + affichage emails. */
  isHostView: boolean;
  /** Slug du Moment (nom du fichier CSV). */
  momentSlug: string;
  /** Titre du Moment (utilisé dans le CSV). */
  momentTitle: string;
  /** Date de début (utilisée dans le CSV). */
  momentStartsAt: Date;
  triggerClassName?: string;
  children: React.ReactNode;
};

export function MomentRegistrationsDialog({
  momentId,
  initialParticipants,
  initialTotal,
  initialHasMore,
  capacity,
  hostUserIds,
  waitlistedRegistrations,
  allRegistrationsForExport,
  isHostView,
  momentSlug,
  momentTitle,
  momentStartsAt,
  triggerClassName,
  children,
}: Props) {
  const hostUserIdSet = new Set(hostUserIds);
  const t = useTranslations("Moment");
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<RegistrationWithUser[]>(initialParticipants);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, startLoad] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
    isPaid: boolean;
  } | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  function handleExportCsv() {
    const eventDate = momentStartsAt.toLocaleDateString();
    const headers = [
      t("registrations.csvHeaders.eventName"),
      t("registrations.csvHeaders.eventDate"),
      t("registrations.csvHeaders.firstName"),
      t("registrations.csvHeaders.lastName"),
      t("registrations.csvHeaders.email"),
      t("registrations.csvHeaders.status"),
      t("registrations.csvHeaders.registeredAt"),
    ];
    const metaRow = [momentTitle, eventDate, ...Array(headers.length - 2).fill("")];
    const rows = allRegistrationsForExport.map((r) => [
      momentTitle,
      eventDate,
      r.user.firstName ?? "",
      r.user.lastName ?? "",
      r.user.email,
      t(`registrations.status.${r.status.toLowerCase() as "registered" | "waitlisted" | "pending_approval" | "rejected"}`),
      new Date(r.registeredAt).toLocaleDateString(),
    ]);
    const csv = [metaRow, headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = momentStartsAt.toISOString().slice(0, 10);
    const titleSlug = momentTitle ? generateSlug(momentTitle).slice(0, 50) : momentSlug;
    a.download = `participants-${titleSlug}-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!open) {
      setParticipants(initialParticipants);
      setHasMore(initialHasMore);
    }
  }, [open, initialParticipants, initialHasMore]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    const currentOffset = participants.length;
    startLoad(async () => {
      const result = await getMomentParticipantsPageAction(momentId, currentOffset, PAGE_SIZE);
      setParticipants((prev) => [...prev, ...result.participants]);
      setHasMore(result.hasMore);
    });
  }, [momentId, participants.length, hasMore, isLoading]);

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
          <div className="min-w-0 flex-1 text-left">
            <DialogTitle className="text-xl font-bold leading-snug">
              {t("public.registrantsCount", { count: initialTotal })}
            </DialogTitle>
            {capacity !== null && (
              <p className="text-muted-foreground text-sm">
                {initialTotal >= capacity
                  ? t("public.eventFull")
                  : t("public.spotsRemaining", { count: Math.max(0, capacity - initialTotal) })}
              </p>
            )}
          </div>
          {isHostView && allRegistrationsForExport.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExportCsv} className="shrink-0">
              <Download className="size-3.5" />
              {t("registrations.exportCsv")}
            </Button>
          )}
          <DialogDescription className="sr-only">
            {t("registrations.title")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6">
          <ul className="divide-border divide-y">
            {participants.map((r) => (
              <ParticipantRow
                key={r.id}
                registration={r}
                showEmail={isHostView}
                isHost={hostUserIdSet.has(r.user.id)}
                isHostView={isHostView}
                onRequestRemove={setRemoveTarget}
              />
            ))}
          </ul>
          {hasMore && (
            <div ref={sentinelRef} className="text-muted-foreground py-4 text-center text-xs">
              {isLoading ? "…" : ""}
            </div>
          )}

          {waitlistedRegistrations.length > 0 && (
            <div className="mt-6">
              <div className="text-muted-foreground border-border flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider">
                <Clock className="size-3.5" />
                {t("registrations.waitlisted", { count: waitlistedRegistrations.length })}
              </div>
              <ul className="divide-border divide-y">
                {waitlistedRegistrations.map((r) => (
                  <ParticipantRow
                    key={r.id}
                    registration={r}
                    showEmail={isHostView}
                    isHost={hostUserIdSet.has(r.user.id)}
                    isHostView={isHostView}
                    onRequestRemove={setRemoveTarget}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>

      {removeTarget && (
        <RemoveRegistrationDialog
          registrationId={removeTarget.id}
          playerName={removeTarget.name}
          open
          onOpenChange={(o) => {
            if (!o) setRemoveTarget(null);
          }}
          willRefund={removeTarget.isPaid}
        />
      )}
    </Dialog>
  );
}

type ParticipantRowProps = {
  registration: RegistrationWithUser;
  showEmail: boolean;
  isHost: boolean;
  isHostView: boolean;
  onRequestRemove: (target: { id: string; name: string; isPaid: boolean }) => void;
};

function ParticipantRow({
  registration,
  showEmail,
  isHost,
  isHostView,
  onRequestRemove,
}: ParticipantRowProps) {
  const t = useTranslations("Dashboard");
  const tMoment = useTranslations("Moment");
  const { user } = registration;
  const displayName = getDisplayName(user.firstName, user.lastName, user.email);
  const avatar = <UserAvatar name={displayName} email={user.email} image={user.image} size="md" />;
  const hostBadge = isHost && (
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
  );
  const info = (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium leading-snug group-hover/member:text-primary dark:group-hover/member:text-[oklch(0.76_0.27_341)] transition-colors">
          {displayName}
        </span>
        {hostBadge}
      </div>
      {showEmail && (
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
      )}
    </div>
  );

  return (
    <li className="flex items-center gap-3 py-2.5">
      {user.publicId ? (
        <Link
          href={`/u/${user.publicId}`}
          className="group/member flex min-w-0 flex-1 items-center gap-3"
        >
          {avatar}
          {info}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {avatar}
          {info}
        </div>
      )}
      <SocialLinks user={user} />
      {isHostView && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 shrink-0 p-0"
              aria-label={tMoment("registrations.actionsLabel")}
              disabled={isHost}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          {!isHost && (
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-muted"
                onSelect={() =>
                  onRequestRemove({
                    id: registration.id,
                    name: displayName,
                    isPaid: registration.paymentStatus === "PAID",
                  })
                }
              >
                <Trash2 className="size-4" />
                {tMoment("registrations.removeAction")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      )}
    </li>
  );
}

type SocialLinksProps = {
  user: RegistrationWithUser["user"];
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
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md transition-colors"
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}
