/**
 * Bascule le mode maintenance via l'API Vercel Edge Config, sans ouvrir le
 * dashboard. Met à jour la clé `maintenance` (true/false) du store, propagée
 * en quelques secondes à toutes les régions, sans rebuild.
 *
 * Usage :
 *   pnpm maintenance:on       # active la maintenance
 *   pnpm maintenance:off      # désactive la maintenance
 *   pnpm maintenance:status   # affiche l'état courant
 *
 * Variables (.env.local) :
 *   VERCEL_TOKEN     [REQUIS]  token API Vercel
 *   EDGE_CONFIG_ID   [OPTION]  id du store (défaut : store de prod)
 *   VERCEL_TEAM_ID   [OPTION]  si le store appartient à une team
 */
import { config } from "dotenv";
config({ path: ".env.local" });

// Store Edge Config de production (créé pour l'issue #545).
const DEFAULT_EDGE_CONFIG_ID = "ecfg_290ik5kuib6seqd7pz7hkoibuhaf";

const action = process.argv[2];
if (!action || !["on", "off", "status"].includes(action)) {
  console.error("Usage : pnpm maintenance:on | maintenance:off | maintenance:status");
  process.exit(1);
}

const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.error("❌ VERCEL_TOKEN manquant dans .env.local");
  process.exit(1);
}

const edgeConfigId = process.env.EDGE_CONFIG_ID ?? DEFAULT_EDGE_CONFIG_ID;
const teamQuery = process.env.VERCEL_TEAM_ID
  ? `?teamId=${process.env.VERCEL_TEAM_ID}`
  : "";
const base = `https://api.vercel.com/v1/edge-config/${edgeConfigId}`;
const authHeaders = { Authorization: `Bearer ${token}` };

async function readStatus(): Promise<boolean | null> {
  const res = await fetch(`${base}/item/maintenance${teamQuery}`, {
    headers: authHeaders,
  });
  if (res.status === 404) return null; // clé absente
  if (!res.ok) {
    throw new Error(`Lecture échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { value?: unknown };
  return data.value === true;
}

async function writeStatus(value: boolean): Promise<void> {
  const res = await fetch(`${base}/items${teamQuery}`, {
    method: "PATCH",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: "maintenance", value }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Écriture échouée (${res.status}) : ${await res.text()}`);
  }
}

async function main() {
  if (action === "status") {
    const current = await readStatus();
    console.log(
      current === null
        ? "ℹ️  Clé `maintenance` absente du store (considérée OFF)."
        : `ℹ️  Maintenance : ${current ? "🔴 ON" : "🟢 OFF"}`
    );
    return;
  }

  const value = action === "on";
  await writeStatus(value);
  console.log(
    value
      ? "🔴 Maintenance ACTIVÉE. Le site sert la page /maintenance (503) sous quelques secondes."
      : "🟢 Maintenance DÉSACTIVÉE. Le site repasse en ligne sous quelques secondes."
  );
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
