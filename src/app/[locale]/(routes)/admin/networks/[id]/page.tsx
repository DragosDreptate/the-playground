import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prismaCircleNetworkRepository } from "@/infrastructure/repositories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetworkForm } from "@/components/admin/network-form";
import { NetworkCircleManager } from "@/components/admin/network-circle-manager";
import { AdminNetworkDeleteButton } from "./delete-button";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminNetworkDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations("Admin");
  const network = await prismaCircleNetworkRepository.findById(id);

  if (!network) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("networkDetail")}</p>
          <h1 className="text-2xl font-bold">{network.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/networks/${network.slug}`} target="_blank">
              <ExternalLink className="size-4" />
              {t("viewPublicPage")}
            </Link>
          </Button>
          <AdminNetworkDeleteButton networkId={network.id} />
        </div>
      </div>

      {/* Formulaire d'édition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("editNetwork")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NetworkForm
            mode="edit"
            networkId={network.id}
            defaultValues={{
              name: network.name,
              slug: network.slug,
              description: network.description ?? "",
              website: network.website ?? "",
              coverImage: network.coverImage ?? "",
            }}
          />
        </CardContent>
      </Card>

      {/* Gestion des Communautés */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("networkMembers")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NetworkCircleManager
            networkId={network.id}
            circles={network.circles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
