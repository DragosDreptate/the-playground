"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check, X } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { getDisplayName } from "@/lib/display-name";
import {
  approveCircleMembershipAction,
  rejectCircleMembershipAction,
} from "@/app/actions/circle";
import {
  approveMomentRegistrationAction,
  rejectMomentRegistrationAction,
} from "@/app/actions/registration";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import type { RegistrationWithUser } from "@/domain/models/registration";

// ── Generic row + list ────────────────────────────────────────

type PendingItem = {
  key: string;
  displayName: string;
  email: string;
  image: string | null;
};

function PendingRequestsListBase({
  title,
  items,
  onAction,
}: {
  title: string;
  items: PendingItem[];
  onAction: (key: string, action: "approve" | "reject") => Promise<boolean>;
}) {
  const t = useTranslations("Dashboard.pendingRequests");
  const [processed, setProcessed] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const visible = items.filter((item) => !processed.has(item.key));
  if (visible.length === 0) return null;

  function handleAction(key: string, action: "approve" | "reject") {
    startTransition(async () => {
      const success = await onAction(key, action);
      if (success) {
        setProcessed((prev) => new Set(prev).add(key));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant="secondary" className="gap-1">
          <Clock className="size-3" />
          {visible.length}
        </Badge>
      </div>
      <div className="divide-border divide-y">
        {visible.map((item) => (
          <div key={item.key} className="flex items-center gap-3 py-2.5">
            <UserAvatar name={item.displayName} email={item.email} image={item.image} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{item.displayName}</p>
              <p className="text-muted-foreground truncate text-xs">{item.email}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleAction(item.key, "approve")} className="gap-1">
                <Check className="size-3.5" />
                {t("approve")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleAction(item.key, "reject")}
                className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
              >
                <X className="size-3.5" />
                {t("reject")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Typed wrappers ────────────────────────────────────────────

type PendingMembershipsListProps = {
  circleId: string;
  pendingMemberships: CircleMemberWithUser[];
};

export function PendingMembershipsList({ circleId, pendingMemberships }: PendingMembershipsListProps) {
  const t = useTranslations("Dashboard.pendingRequests");
  const router = useRouter();

  if (pendingMemberships.length === 0) return null;

  const items: PendingItem[] = pendingMemberships.map((m) => ({
    key: m.userId,
    displayName: getDisplayName(m.user.firstName, m.user.lastName, m.user.email),
    email: m.user.email,
    image: m.user.image,
  }));

  async function handleAction(userId: string, action: "approve" | "reject") {
    const result = action === "approve"
      ? await approveCircleMembershipAction(circleId, userId)
      : await rejectCircleMembershipAction(circleId, userId);
    if (result.success) router.refresh();
    return result.success;
  }

  return <PendingRequestsListBase title={t("membershipsTitle")} items={items} onAction={handleAction} />;
}

type PendingRegistrationsListProps = {
  pendingRegistrations: RegistrationWithUser[];
};

export function PendingRegistrationsList({ pendingRegistrations }: PendingRegistrationsListProps) {
  const t = useTranslations("Dashboard.pendingRequests");
  const router = useRouter();

  if (pendingRegistrations.length === 0) return null;

  const items: PendingItem[] = pendingRegistrations.map((r) => ({
    key: r.id,
    displayName: getDisplayName(r.user.firstName, r.user.lastName, r.user.email),
    email: r.user.email,
    image: r.user.image,
  }));

  async function handleAction(registrationId: string, action: "approve" | "reject") {
    const result = action === "approve"
      ? await approveMomentRegistrationAction(registrationId)
      : await rejectMomentRegistrationAction(registrationId);
    if (result.success) router.refresh();
    return result.success;
  }

  return <PendingRequestsListBase title={t("registrationsTitle")} items={items} onAction={handleAction} />;
}
