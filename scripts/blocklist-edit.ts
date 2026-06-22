/**
 * Édite la blocklist anti-abus dynamique (clé `signInBlocklist` du store Edge
 * Config), sans rebuild ni déploiement. Propagé à toutes les régions en
 * quelques secondes. Lu au sign-in par `dynamic-blocklist.ts`.
 *
 * Usage :
 *   pnpm block <email>                # bloque un email
 *   pnpm block domain:<domaine>       # bloque un domaine (jetable)
 *   pnpm block oauth:<providerAccountId>
 *   pnpm unblock <même syntaxe>       # retire une entrée
 *   pnpm blocklist                    # affiche l'état courant
 *
 * Variables (.env.local) :
 *   VERCEL_TOKEN     [REQUIS]  token API Vercel
 *   EDGE_CONFIG_ID   [OPTION]  id du store (défaut : store de prod)
 *   VERCEL_TEAM_ID   [OPTION]  si le store appartient à une team
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import {
  coerceBlocklist,
  SIGN_IN_BLOCKLIST_KEY,
  type DynamicBlocklist,
} from "@/infrastructure/auth/dynamic-blocklist";

// Store Edge Config de production (partagé avec le mode maintenance, issue #545).
const DEFAULT_EDGE_CONFIG_ID = "ecfg_290ik5kuib6seqd7pz7hkoibuhaf";

type Category = keyof DynamicBlocklist;

const action = process.argv[2];
if (!action || !["add", "remove", "list"].includes(action)) {
  console.error("Usage : pnpm block | unblock <email|domain:…|oauth:…> | blocklist");
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

const normalize = (s: string) => s.trim().toLowerCase();

/** `domain:x` → ["domains","x"], `oauth:x` → ["oauthIds","x"], sinon email. */
function parseTarget(raw: string): { category: Category; value: string } {
  const target = raw.trim();
  if (target.startsWith("domain:")) {
    return { category: "domains", value: normalize(target.slice(7)) };
  }
  if (target.startsWith("oauth:")) {
    return { category: "oauthIds", value: target.slice(6).trim() };
  }
  return { category: "emails", value: normalize(target) };
}

async function readBlocklist(): Promise<DynamicBlocklist> {
  const res = await fetch(`${base}/item/${SIGN_IN_BLOCKLIST_KEY}${teamQuery}`, {
    headers: authHeaders,
  });
  if (res.status === 404) return coerceBlocklist(undefined);
  if (!res.ok) {
    throw new Error(`Lecture échouée (${res.status}) : ${await res.text()}`);
  }
  const data = (await res.json()) as { value?: unknown };
  // Même coercion que le runtime : tolère une valeur éditée à la main /
  // corrompue (non-array, éléments non-string) sans crasher.
  return coerceBlocklist(data.value);
}

async function writeBlocklist(value: DynamicBlocklist): Promise<void> {
  const res = await fetch(`${base}/items${teamQuery}`, {
    method: "PATCH",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: SIGN_IN_BLOCKLIST_KEY, value }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Écriture échouée (${res.status}) : ${await res.text()}`);
  }
}

function printBlocklist(b: DynamicBlocklist): void {
  const fmt = (xs: string[]) => (xs.length ? xs.join(", ") : "—");
  console.log("📋 Blocklist dynamique (Edge Config) :");
  console.log(`   emails   : ${fmt(b.emails)}`);
  console.log(`   domains  : ${fmt(b.domains)}`);
  console.log(`   oauthIds : ${fmt(b.oauthIds)}`);
}

async function main() {
  const current = await readBlocklist();

  if (action === "list") {
    printBlocklist(current);
    return;
  }

  const targetArg = process.argv[3];
  if (!targetArg) {
    console.error("❌ Cible manquante. Ex : pnpm block ln941535@mailsecondary.com");
    process.exit(1);
  }
  const { category, value } = parseTarget(targetArg);
  if (!value) {
    console.error("❌ Cible vide après normalisation.");
    process.exit(1);
  }
  // Le suffix-walk runtime ne matche jamais un domaine d'un seul label : un
  // tel blocage serait silencieusement inerte. On le refuse explicitement.
  if (category === "domains" && value.split(".").length < 2) {
    console.error(
      `❌ Domaine invalide « ${value} » : au moins 2 labels requis (ex. evil.com).`
    );
    process.exit(1);
  }

  const list = current[category];
  if (action === "add") {
    if (list.includes(value)) {
      console.log(`ℹ️  Déjà présent dans ${category} : ${value}`);
      return;
    }
    current[category] = [...list, value];
  } else {
    if (!list.includes(value)) {
      console.log(`ℹ️  Absent de ${category} : ${value}`);
      return;
    }
    current[category] = list.filter((x) => x !== value);
  }

  await writeBlocklist(current);
  console.log(
    `${action === "add" ? "🔴 Bloqué" : "🟢 Débloqué"} (${category}) : ${value}`
  );
  console.log("Effet en prod sous quelques secondes (aucun rebuild).");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
