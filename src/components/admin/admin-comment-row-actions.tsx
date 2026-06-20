"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminDeleteButton } from "./admin-delete-button";
import {
  adminApproveCommentAction,
  adminDeleteCommentAction,
} from "@/app/actions/comment";

type Props = {
  commentId: string;
  isPending: boolean;
};

export function AdminCommentRowActions({ commentId, isPending }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      await adminApproveCommentAction(commentId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {isPending && (
        <Button variant="outline" size="sm" onClick={approve} disabled={pending}>
          <Check className="mr-1.5 size-3.5" />
          Approuver
        </Button>
      )}
      <AdminDeleteButton
        onDelete={async () => {
          const result = await adminDeleteCommentAction(commentId);
          router.refresh();
          return result;
        }}
      />
    </div>
  );
}
