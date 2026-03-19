"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { joinCircleByInviteAction } from "@/app/actions/circle";
import { Link } from "@/i18n/navigation";
import { CheckCircle, Clock } from "lucide-react";

type Props = {
  token: string;
  isAuthenticated: boolean;
  alreadyMember: boolean;
  pendingApproval: boolean;
  requiresApproval: boolean;
  circleSlug: string;
  t: {
    joinButton: string;
    joinRequiresApproval: string;
    joinSignIn: string;
    alreadyMember: string;
    pendingApproval: string;
    viewCircle: string;
  };
};

export function JoinCircleByInviteForm({
  token,
  isAuthenticated,
  alreadyMember: initialAlreadyMember,
  pendingApproval: initialPendingApproval,
  requiresApproval,
  circleSlug,
  t,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alreadyMember] = useState(initialAlreadyMember);
  const [pendingApproval, setPendingApproval] = useState(initialPendingApproval);

  if (!isAuthenticated) {
    return (
      <Button asChild size="lg" className="w-full">
        <Link href={`/auth/sign-in?callbackUrl=/circles/join/${token}`}>
          {t.joinSignIn}
        </Link>
      </Button>
    );
  }

  if (alreadyMember) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="size-4 text-green-500 shrink-0" />
          <span>{t.alreadyMember}</span>
        </div>
        <Button asChild size="lg" className="w-full" variant="outline">
          <Link href={`/circles/${circleSlug}`}>
            {t.viewCircle}
          </Link>
        </Button>
      </div>
    );
  }

  if (pendingApproval) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4 text-amber-500 shrink-0" />
          <span>{t.pendingApproval}</span>
        </div>
        <Button asChild size="lg" className="w-full" variant="outline">
          <Link href={`/circles/${circleSlug}`}>
            {t.viewCircle}
          </Link>
        </Button>
      </div>
    );
  }

  async function handleJoin() {
    setLoading(true);
    try {
      const result = await joinCircleByInviteAction(token);
      if (result.success) {
        if (result.data.pendingApproval) {
          setPendingApproval(true);
        } else {
          router.push(`/circles/${circleSlug}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleJoin}
      disabled={loading}
    >
      {loading ? "..." : requiresApproval ? t.joinRequiresApproval : t.joinButton}
    </Button>
  );
}
