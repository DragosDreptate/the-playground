"use client";

import { useRouter } from "next/navigation";
import { adminDeleteCircleAction } from "@/app/actions/admin";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";

export function AdminCircleDeleteButton({ circleId }: { circleId: string }) {
  const router = useRouter();

  async function handleDelete() {
    const result = await adminDeleteCircleAction(circleId);
    if (result.success) {
      router.push("/admin/circles");
    }
    return result;
  }

  return <AdminDeleteButton onDelete={handleDelete} />;
}
