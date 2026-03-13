import Link from "next/link";
import { getTranslations } from "next-intl/server";

type Props = {
  activeTab: "circles" | "moments";
};

export async function AdminExplorerTabs({ activeTab }: Props) {
  const t = await getTranslations("Admin");

  const tabs = [
    { key: "circles" as const, href: "/admin/explorer", label: t("explorer.tabs.circles") },
    { key: "moments" as const, href: "/admin/explorer/moments", label: t("explorer.tabs.moments") },
  ];

  return (
    <div className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === tab.key
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
