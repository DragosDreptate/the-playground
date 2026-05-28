type VerificationTokenArgs = { identifier: string; token: string };

type VerificationTokenRow = {
  identifier: string;
  token: string;
  expires: Date;
};

type Where = { where: { identifier_token: VerificationTokenArgs } };

// Type structurel minimal de ce dont l'adapter a besoin. Évite la dépendance
// sur le type exact du client Prisma étendu (`$extends`) — utile aussi pour
// les tests unitaires qui injectent un mock.
type VerificationTokenStore = {
  verificationToken: {
    findUnique: (args: Where) => Promise<VerificationTokenRow | null>;
    delete: (args: Where) => Promise<unknown>;
  };
};

// Code d'erreur Prisma "Record not found" — émis si un autre processus a déjà
// supprimé le token entre notre findUnique et notre delete. On l'absorbe
// silencieusement, mais on laisse remonter toutes les autres erreurs (panne
// DB, timeout, permissions) pour préserver l'observabilité Sentry.
// Cf. https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
const PRISMA_RECORD_NOT_FOUND = "P2025";

function isPrismaRecordNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === PRISMA_RECORD_NOT_FOUND
  );
}

/**
 * Adapter `useVerificationToken` qui rend le magic link RÉUTILISABLE pendant
 * sa fenêtre de validité, au lieu d'être consommé au premier appel comme le
 * fait `@auth/prisma-adapter` par défaut.
 *
 * Sans cet override, les scanners email corporate (Microsoft Defender Safe
 * Links, Mimecast, Proofpoint…) qui prefetchent les liens consument le token
 * avant l'utilisateur. Avec un token réutilisable + une fenêtre courte (15
 * min, configurée via `maxAge` sur le provider), l'utilisateur humain peut
 * cliquer son lien même si un scanner l'a déjà prefetché.
 *
 * Auth.js stocke et lookup le token HASHÉ (createHash(token + secret)), cf.
 * @auth/core/lib/actions/signin/send-token.js et callback/index.js. L'argument
 * `token` reçu ici est déjà le hash — on le passe tel quel à findUnique sans
 * re-hasher.
 */
export function createReusableVerificationToken(prisma: VerificationTokenStore) {
  return async function useVerificationToken({ identifier, token }: VerificationTokenArgs) {
    const where = { identifier_token: { identifier, token } };
    const vt = await prisma.verificationToken.findUnique({ where });
    if (!vt) return null;
    // Le check d'expiration ici est un cleanup opportuniste, pas une garantie
    // de sécurité : Auth.js core ré-vérifie `invite.expires` après notre
    // return (cf. @auth/core/lib/actions/callback/index.js:147). Sans ce
    // delete-on-read, les tokens expirés s'accumuleraient en attendant le
    // cron quotidien — on garbage-collecte ici à chaque tentative.
    if (vt.expires < new Date()) {
      try {
        await prisma.verificationToken.delete({ where });
      } catch (err) {
        if (!isPrismaRecordNotFound(err)) throw err;
      }
      return null;
    }
    return vt;
  };
}
