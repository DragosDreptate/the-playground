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
    const vt = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });
    if (!vt) return null;
    if (vt.expires < new Date()) {
      await prisma.verificationToken
        .delete({ where: { identifier_token: { identifier, token } } })
        .catch(() => null);
      return null;
    }
    return vt;
  };
}
