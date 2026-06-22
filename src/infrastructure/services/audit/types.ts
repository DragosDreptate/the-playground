// Types partagés de l'audit de compte (`/audit-user`, mode bouton admin).

/** Dossier brut collecté (DB + PostHog + signaux dérivés), envoyé au LLM. */
export type AuditDossier = {
  found: boolean;
  identifier: string;
  account?: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
    onboardingCompleted: boolean;
    publicId: string | null;
    emailVerified: boolean;
    dashboardMode: string | null;
    hasAvatar: boolean;
    providers: { provider: string; providerAccountId: string }[];
  };
  content?: {
    circlesHosted: {
      name: string;
      description: string;
      website: string | null;
      visibility: string;
      category: string | null;
      city: string | null;
      createdAt: string;
    }[];
    momentsCreated: {
      title: string;
      description: string;
      videoLink: string | null;
      locationAddress: string | null;
      status: string;
      createdAt: string;
    }[];
  };
  engagement?: {
    memberships: number;
    registrations: number;
    comments: number;
  };
  behavior?: {
    clientCities: string[]; // geoip CLIENT (le serveur Frankfurt est exclu)
    geoipUnstable: boolean; // plusieurs villes client = hopping possible
    firstSeen: string | null;
    lastSeen: string | null;
    eventCount: number;
    arrivalReferer: string | null;
  };
  derived?: {
    emailDomain: string;
    disposableEmail: boolean;
    localpartLooksRandom: boolean;
    nameAllCaps: boolean;
    blocked: boolean; // présent dans la blocklist (email/oauth/domaine)
  };
};

export type AuditVerdictLean = "likely_legit" | "ambiguous" | "likely_spam";

/** Rapport structuré renvoyé par le LLM (orienté décision humaine). */
export type AuditReport = {
  found: boolean;
  identitySummary: string;
  contentSummary: string;
  behaviorSummary: string;
  signalsFor: string[]; // à charge (spam)
  signalsAgainst: string[]; // à décharge (légitime)
  verdictLean: AuditVerdictLean;
  recommendation: string;
  /** Coût réel de l'appel (tokens), pour instrumentation. */
  usage?: { inputTokens: number; outputTokens: number; model: string };
};

/** Cibles de blocage proposées par l'audit (le blocage reste une action humaine). */
export type AuditTargets = {
  email: string | null;
  domain: string | null;
  oauthId: string | null;
  alreadyBlocked: boolean;
};

export type AuditOutcome = {
  report: AuditReport;
  targets: AuditTargets;
};
