"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition, useState } from "react";
import { adminDeleteMomentAction, adminCancelMomentAction } from "@/app/actions/admin";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { Button } from "@/components/ui/button";
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
import { Ban } from "lucide-react";
import type { MomentStatus } from "@/domain/models/moment";

type Props = {
  momentId: string;
  status: MomentStatus;
};

export function AdminMomentActions({ momentId, status }: Props) {
  const t = useTranslations("Admin.actions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);

  async function handleDelete() {
    const result = await adminDeleteMomentAction(momentId);
    if (result.success) {
      router.push("/admin/moments");
    }
    return result;
  }

  function handleCancel() {
    startTransition(async () => {
      await adminCancelMomentAction(momentId);
      setCancelOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "PUBLISHED" && (
        <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Ban className="mr-1.5 size-3.5" />
              {t("cancelMoment")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("cancelMoment")}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirmCancel")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isPending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {t("cancelMoment")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <AdminDeleteButton onDelete={handleDelete} />
    </div>
  );
}
