"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  followCircleAction,
  unfollowCircleAction,
} from "@/app/actions/circle";

type Props = {
  circleId: string;
  initialFollowing: boolean;
};

export function FollowButton({ circleId, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();
  const [isHovering, setIsHovering] = useState(false);

  function handleToggle() {
    startTransition(async () => {
      if (following) {
        await unfollowCircleAction(circleId);
        setFollowing(false);
      } else {
        await followCircleAction(circleId);
        setFollowing(true);
      }
    });
  }

  if (following) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={handleToggle}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={isPending}
        className="w-full gap-2"
      >
        {isHovering ? (
          <>
            <BellOff className="size-4" />
            Se désabonner
          </>
        ) : (
          <>
            <Bell className="size-4" />
            <span>Abonné·e</span>
            <Check className="size-3.5" />
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className="w-full gap-2 border-primary/40 text-primary hover:border-primary hover:bg-primary/10 hover:text-primary"
    >
      <Bell className="size-4" />
      Suivre
    </Button>
  );
}
