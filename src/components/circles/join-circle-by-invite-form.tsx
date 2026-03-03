"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { joinCircleByInviteAction } from "@/app/actions/circle";
import { Link } from "@/i18n/navigation";
import { CheckCircle } from "lucide-react";

type Props = {
  token: string;
  isAuthenticated: boolean;
  alreadyMember: boolean;
  circleSlug: string;
  t: {
    joinButton: string;
    joinSignIn: string;
    alreadyMember: string;
    viewCircle: string;
  };
};

export function JoinCircleByInviteForm({
  token,
  isAuthenticated,
  alreadyMember: initialAlreadyMember,
  circleSlug,
  t,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alreadyMember] = useState(initialAlreadyMember);

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
          <Link href={`/dashboard/circles/${circleSlug}`}>
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
        router.push(`/dashboard/circles/${circleSlug}`);
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
      {loading ? "..." : t.joinButton}
    </Button>
  );
}
