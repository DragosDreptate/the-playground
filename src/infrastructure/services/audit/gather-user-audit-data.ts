import { prisma } from "@/infrastructure/db/prisma";
import {
  extractDomain,
  isDisposableEmailDomain,
} from "@/lib/email/disposable-domains";
import { checkBlockedSignIn } from "@/infrastructure/auth/dynamic-blocklist";
import { queryPostHog } from "./posthog-query";
import type { AuditDossier } from "./types";

/** Échappe un littéral string pour une requête HogQL (apostrophes doublées). */
function hogqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/** Heuristique simple : le localpart d'un email a-t-il l'air aléatoire ? */
function localpartLooksRandom(localpart: string): boolean {
  const lp = localpart.toLowerCase();
  if (lp.length < 6) return false;
  const digits = (lp.match(/\d/g) ?? []).length;
  const letters = (lp.match(/[a-z]/g) ?? []).length;
  const vowels = (lp.match(/[aeiou]/g) ?? []).length;
  // Beaucoup de chiffres, ou des lettres sans presque aucune voyelle (mqd5o6f9n5h3).
  const digitRatio = digits / lp.length;
  const vowelRatio = letters > 0 ? vowels / letters : 0;
  return digitRatio >= 0.4 || (lp.length >= 8 && vowelRatio < 0.15);
}

/** Le nom (prénom + nom) est-il entièrement en majuscules (alphabet à casse) ? */
function nameAllCaps(first: string | null, last: string | null): boolean {
  const full = [first, last].filter(Boolean).join(" ").trim();
  const letters = full.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

/** Collecte le dossier d'audit d'un compte (DB + PostHog + signaux dérivés). */
export async function gatherUserAuditData(
  identifier: string
): Promise<AuditDossier> {
  const id = identifier.trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id },
        { email: id },
        { publicId: id },
        { accounts: { some: { providerAccountId: id } } },
      ],
    },
    include: {
      accounts: { select: { provider: true, providerAccountId: true } },
      memberships: {
        where: { role: { in: ["HOST", "CO_HOST"] } },
        include: { circle: true },
      },
      moments: { orderBy: { createdAt: "asc" } }, // relation CreatedMoments
      _count: {
        select: { memberships: true, registrations: true, comments: true },
      },
    },
  });

  if (!user) return { found: false, identifier: id };

  const providerAccountId = user.accounts[0]?.providerAccountId;
  const emailDomain = extractDomain(user.email) ?? "unknown";
  const localpart = user.email.split("@")[0] ?? "";

  const idLit = hogqlString(user.id);
  const emailLit = hogqlString(user.email);
  const where = `(distinct_id = '${idLit}' OR person.properties.email = '${emailLit}')`;

  // Ces 3 I/O ne dépendent que du `user` déjà chargé → en parallèle
  // (latence = max d'un round-trip, pas la somme).
  const [blockedReason, cityRows, overall] = await Promise.all([
    checkBlockedSignIn(user.email, providerAccountId),
    // Géoloc depuis les events CLIENT uniquement ($pageview) : les events
    // serveur (auth_sign_in) portent le geoip du serveur Vercel, pas le client.
    queryPostHog(
      `SELECT properties.$geoip_city_name AS city, count() AS n FROM events WHERE ${where} AND event = '$pageview' AND properties.$geoip_city_name IS NOT NULL GROUP BY city ORDER BY n DESC LIMIT 20`
    ) as Promise<[string, number][]>,
    queryPostHog(
      `SELECT min(timestamp) AS first, max(timestamp) AS last, count() AS n, any(properties.referer) AS referer FROM events WHERE ${where}`
    ) as Promise<[string | null, string | null, number, string | null][]>,
  ]);
  const blocked = blockedReason !== null;

  const clientCities = cityRows
    .filter((r): r is [string, number] => Array.isArray(r) && !!r[0])
    .map((r) => r[0]);
  const [first, last, eventCount, referer] = overall[0] ?? [null, null, 0, null];

  return {
    found: true,
    identifier: id,
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt.toISOString(),
      onboardingCompleted: user.onboardingCompleted,
      publicId: user.publicId,
      emailVerified: !!user.emailVerified,
      dashboardMode: user.dashboardMode,
      hasAvatar: !!user.image,
      providers: user.accounts.map((a) => ({
        provider: a.provider,
        providerAccountId: a.providerAccountId,
      })),
    },
    content: {
      circlesHosted: user.memberships.map((m) => ({
        name: m.circle.name,
        description: m.circle.description,
        website: m.circle.website,
        visibility: m.circle.visibility,
        category: m.circle.category,
        city: m.circle.city,
        createdAt: m.circle.createdAt.toISOString(),
      })),
      momentsCreated: user.moments.map((mo) => ({
        title: mo.title,
        description: mo.description,
        videoLink: mo.videoLink,
        locationAddress: mo.locationAddress,
        status: mo.status,
        createdAt: mo.createdAt.toISOString(),
      })),
    },
    engagement: {
      memberships: user._count.memberships,
      registrations: user._count.registrations,
      comments: user._count.comments,
    },
    behavior: {
      clientCities,
      geoipUnstable: new Set(clientCities).size > 1,
      firstSeen: first,
      lastSeen: last,
      eventCount: Number(eventCount) || 0,
      arrivalReferer: referer,
    },
    derived: {
      emailDomain,
      disposableEmail: isDisposableEmailDomain(user.email),
      localpartLooksRandom: localpartLooksRandom(localpart),
      nameAllCaps: nameAllCaps(user.firstName, user.lastName),
      blocked,
    },
  };
}
