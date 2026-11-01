import { getLocale, getTranslations } from "next-intl/server";
import { isSupportedLocale, routing, type Locale } from "@/i18n/routing";

/**
 * Locale appliquée à un destinataire dont la langue n'est pas connue
 * (aucune langue mémorisée sur son compte, ou adresse sans compte).
 */
export const DEFAULT_RECIPIENT_LOCALE: Locale = routing.defaultLocale;

/** Langue mémorisée sur le compte (`User.preferredLocale`) → locale email, repli par défaut. */
export function toRecipientLocale(storedLocale: string | null | undefined): Locale {
  return storedLocale && isSupportedLocale(storedLocale)
    ? storedLocale
    : DEFAULT_RECIPIENT_LOCALE;
}

export type EmailTranslations = Awaited<ReturnType<typeof getTranslations<"Email">>>;

/** Charge en une requête les langues mémorisées d'une liste d'utilisateurs. */
export type RecipientLocaleLoader = (
  userIds: string[],
) => Promise<Map<string, string | null>>;

export type EmailLocaleGroup<T> = {
  locale: Locale;
  t: EmailTranslations;
  items: T[];
};

/**
 * Résolveur de locale email "par destinataire".
 *
 * Règle :
 * - Le **déclencheur** de l'action garde la locale de la requête HTTP courante
 *   (= `getLocale()`, dérivée du préfixe d'URL `/fr` ou `/en`) : c'est la langue
 *   de l'interface qu'il a sous les yeux.
 * - Tout **autre destinataire** reçoit l'email dans la langue mémorisée sur son
 *   compte (dernière langue choisie dans l'interface), à défaut la locale par défaut.
 */
export type EmailLocaleResolver = {
  /**
   * Charge en une requête les langues de destinataires connus à l'avance, pour
   * que les `resolveFor` / `translationsFor` suivants ne touchent plus la base.
   */
  preload: (recipientUserIds: string[]) => Promise<void>;
  resolveFor: (recipientUserId: string | null | undefined) => Promise<Locale>;
  translationsFor: (
    recipientUserId: string | null | undefined,
  ) => Promise<EmailTranslations>;
  defaultTranslations: () => Promise<EmailTranslations>;
  /**
   * Regroupe des destinataires par locale (une seule requête pour les langues
   * pas encore chargées) et fournit les traductions de chaque groupe. Sert aux
   * envois groupés : un lot par langue au lieu d'un texte unique.
   */
  groupByLocale: <T>(
    items: T[],
    getUserId: (item: T) => string | null | undefined,
  ) => Promise<EmailLocaleGroup<T>[]>;
};

/**
 * Construit un resolver pour une action déclenchée par `triggerUserId`.
 * Mémoïse les langues chargées et les traductions par locale pour éviter les
 * rechargements lors d'un envoi vers plusieurs destinataires.
 */
export async function createEmailLocaleResolver(
  triggerUserId: string | null | undefined,
  loadRecipientLocales: RecipientLocaleLoader,
): Promise<EmailLocaleResolver> {
  const triggerLocale = toRecipientLocale(await getLocale());
  const translationsCache = new Map<Locale, Promise<EmailTranslations>>();
  const localeCache = new Map<string, Locale>();

  const translationsForLocale = (locale: Locale) => {
    let cached = translationsCache.get(locale);
    if (!cached) {
      cached = getTranslations({ locale, namespace: "Email" });
      translationsCache.set(locale, cached);
    }
    return cached;
  };

  const isTrigger = (userId: string) => !!triggerUserId && userId === triggerUserId;

  async function loadMissing(userIds: string[]): Promise<void> {
    const missing = [
      ...new Set(userIds.filter((id) => !isTrigger(id) && !localeCache.has(id))),
    ];
    if (missing.length === 0) return;
    const stored = await loadRecipientLocales(missing);
    for (const id of missing) {
      localeCache.set(id, toRecipientLocale(stored.get(id)));
    }
  }

  const cachedLocaleFor = (userId: string | null | undefined): Locale => {
    if (!userId) return DEFAULT_RECIPIENT_LOCALE;
    if (isTrigger(userId)) return triggerLocale;
    return localeCache.get(userId) ?? DEFAULT_RECIPIENT_LOCALE;
  };

  const resolveFor = async (recipientUserId: string | null | undefined) => {
    if (recipientUserId) await loadMissing([recipientUserId]);
    return cachedLocaleFor(recipientUserId);
  };

  const groupByLocale = async <T,>(
    items: T[],
    getUserId: (item: T) => string | null | undefined,
  ): Promise<EmailLocaleGroup<T>[]> => {
    await loadMissing(items.map(getUserId).filter((id): id is string => !!id));
    const byLocale = new Map<Locale, T[]>();
    for (const item of items) {
      const locale = cachedLocaleFor(getUserId(item));
      const group = byLocale.get(locale);
      if (group) group.push(item);
      else byLocale.set(locale, [item]);
    }
    return Promise.all(
      [...byLocale].map(async ([locale, groupItems]) => ({
        locale,
        t: await translationsForLocale(locale),
        items: groupItems,
      })),
    );
  };

  return {
    preload: loadMissing,
    resolveFor,
    translationsFor: async (recipientUserId) =>
      translationsForLocale(await resolveFor(recipientUserId)),
    defaultTranslations: () => translationsForLocale(DEFAULT_RECIPIENT_LOCALE),
    groupByLocale,
  };
}
