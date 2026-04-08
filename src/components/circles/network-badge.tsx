import { Link } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import type { CircleNetwork } from "@/domain/models/circle-network";

type Props = {
  networks: CircleNetwork[];
  label: string;
};

export function NetworkBadge({ networks, label }: Props) {
  if (networks.length === 0) return null;

  return (
    <div className="space-y-1.5 px-1">
      {networks.map((network) => (
        <Link
          key={network.id}
          href={`/networks/${network.slug}`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        >
          <Globe className="size-3.5 shrink-0" />
          <span>
            {label}{" "}
            <span className="font-medium underline underline-offset-2">
              {network.name}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
