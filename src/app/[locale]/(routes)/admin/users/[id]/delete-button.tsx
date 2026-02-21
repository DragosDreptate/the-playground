"use client";

import { useRouter } from "next/navigation";
import { adminDeleteUserAction } from "@/app/actions/admin";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";

export function AdminUserDeleteButton({ userId }: { userId: string }) {
  const router = useRouter();

  async function handleDelete() {
    const result = await adminDeleteUserAction(userId);
    if (result.success) {
      router.push("/admin/users");
    }
    return result;
  }

  return <AdminDeleteButton onDelete={handleDelete} />;
}
