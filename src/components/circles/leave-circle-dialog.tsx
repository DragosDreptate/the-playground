"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { leaveCircleAction } from "@/app/actions/circle";

type LeaveCircleDialogProps = {
  circleId: string;
  circleName: string;
};

export function LeaveCircleDialog({ circleId, circleName }: LeaveCircleDialogProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setIsPending(true);
    setError(null);

    const result = await leaveCircleAction(circleId);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error);
      setIsPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-3.5" />
          Quitter la Communauté
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quitter {circleName} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Tu vas quitter cette Communauté et ne seras plus listé comme membre.
            Tes inscriptions aux prochains événements seront annulées et les places
            libérées pour les personnes en liste d&apos;attente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeave}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "En cours…" : "Quitter la Communauté"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
