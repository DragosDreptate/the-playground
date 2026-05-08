import { getLocale, getTranslations } from "next-intl/server";

/**
 * Locale appliquée à tout destinataire qui n'est pas le déclencheur de l'action.
 * En l'absence de préférence de langue stockée par utilisateur, on retombe sur
 * le défaut de la plateforme. À remplacer par une lecture de `User.preferredLocale`
 * lorsque le champ existera.
 */
export const DEFAULT_RECIPIENT_LOCALE = "fr";

type EmailTranslations = Awaited<ReturnType<typeof getTranslations<"Email">>>;

/**
 * Résolveur de locale email "par destinataire".
 *
 * Règle unique :
 * - Le **déclencheur** de l'action garde la locale de la requête HTTP courante
 *   (= `getLocale()`, dérivée du préfixe d'URL `/fr` ou `/en`).
 * - Tout **autre destinataire** reçoit l'email dans la locale par défaut FR,
 *   indépendamment de l'URL où le déclencheur se trouvait au moment d'agir.
 *
 * Évite ainsi qu'un Player anglophone qui s'inscrit depuis `/en/m/...` envoie
 * une notification EN à des Hosts francophones — et le cas symétrique.
 */
export type EmailLocaleResolver = {
  triggerLocale: string;
  defaultLocale: string;
  resolveFor: (recipientUserId: string | null | undefined) => string;
  translationsFor: (
    recipientUserId: string | null | undefined,
  ) => Promise<EmailTranslations>;
  defaultTranslations: () => Promise<EmailTranslations>;
  triggerTranslations: () => Promise<EmailTranslations>;
};

/**
 * Construit un resolver pour une action déclenchée par `triggerUserId`.
 * Mémoïse les deux instances `t` (déclencheur + défaut) pour éviter les
 * rechargements lors d'un envoi vers plusieurs destinataires.
 */
export async function buildEmailLocaleResolver(
  triggerUserId: string | null | undefined,
): Promise<EmailLocaleResolver> {
  const triggerLocale = await getLocale();
  const cache = new Map<string, Promise<EmailTranslations>>();

  const loadTranslations = (locale: string) => {
    let cached = cache.get(locale);
    if (!cached) {
      cached = getTranslations({ locale, namespace: "Email" });
      cache.set(locale, cached);
    }
    return cached;
  };

  const resolveFor = (recipientUserId: string | null | undefined): string => {
    if (triggerUserId && recipientUserId && recipientUserId === triggerUserId) {
      return triggerLocale;
    }
    return DEFAULT_RECIPIENT_LOCALE;
  };

  return {
    triggerLocale,
    defaultLocale: DEFAULT_RECIPIENT_LOCALE,
    resolveFor,
    translationsFor: (recipientUserId) =>
      loadTranslations(resolveFor(recipientUserId)),
    defaultTranslations: () => loadTranslations(DEFAULT_RECIPIENT_LOCALE),
    triggerTranslations: () => loadTranslations(triggerLocale),
  };
}
