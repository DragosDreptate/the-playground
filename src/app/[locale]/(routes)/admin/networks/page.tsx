import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { prismaCircleNetworkRepository } from "@/infrastructure/repositories";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminNetworksPage() {
  const t = await getTranslations("Admin");
  const networks = await prismaCircleNetworkRepository.findAll();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("networks")}</h1>
        <Button variant="default" size="sm" asChild>
          <Link href="/admin/networks/new">
            <Plus className="mr-1.5 size-3.5" />
            {t("createNetwork")}
          </Link>
        </Button>
      </div>

      {networks.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("noNetworks")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="w-px text-right">
                  {t("circles")}
                </TableHead>
                <TableHead className="w-px">{t("columns.createdAt")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {networks.map((network) => (
                <TableRow key={network.id}>
                  <TableCell>
                    <Link
                      href={`/admin/networks/${network.id}`}
                      className="font-medium hover:underline"
                    >
                      {network.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {network.slug}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {network.circleCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {network.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/networks/${network.slug}`}
                      target="_blank"
                      className="text-muted-foreground hover:text-foreground"
                      title="Voir la page publique"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
