const FALLBACK_URL = "https://the-playground.fr";

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_URL;
}
