"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { adminDeleteNetworkAction } from "@/app/actions/admin";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";

export function AdminNetworkDeleteButton({ networkId }: { networkId: string }) {
  const router = useRouter();
  const t = useTranslations("Admin");

  async function handleDelete() {
    const result = await adminDeleteNetworkAction(networkId);
    if (result.success) {
      router.push("/admin/networks");
    }
    return result;
  }

  return (
    <AdminDeleteButton
      onDelete={handleDelete}
      confirmMessage={t("confirmDeleteNetwork")}
    />
  );
}
