/**
 * Format a price in cents to a human-readable string.
 * @param cents - Price in cents (e.g. 1500 = 15.00)
 * @param currency - Currency code (e.g. "EUR")
 * @param locale - Locale for formatting (e.g. "fr-FR")
 * @returns Formatted price string (e.g. "15,00 EUR")
 */
export function formatPrice(
  cents: number,
  currency: string,
  locale: string = "fr-FR"
): string {
  return (
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100) +
    " " +
    currency
  );
}
