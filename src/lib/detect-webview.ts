/**
 * Detects in-app browsers (WebViews) from LinkedIn, Instagram, Facebook, WhatsApp, etc.
 * Google blocks OAuth from these browsers with `Error 403: disallowed_useragent`.
 */

/** Token UA de la webview in-app LinkedIn (cf. `isLinkedInInAppBrowser`). */
const LINKEDIN_APP = "LinkedInApp";

const WEBVIEW_PATTERNS = [
  "FBAN", // Facebook App
  "FBAV", // Facebook App (version)
  "Instagram",
  LINKEDIN_APP,
  "Line/",
  "Twitter", // X app
  "Snapchat",
  "WhatsApp",
  "Telegram",
  "MicroMessenger", // WeChat
  "wv", // Android WebView
];

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return WEBVIEW_PATTERNS.some((p) => ua.includes(p));
}

/**
 * Détecte spécifiquement la webview in-app de LinkedIn. Contrairement aux autres
 * webviews, l'OAuth LinkedIn y aboutit (l'utilisateur est déjà dans l'écosystème
 * LinkedIn) : on peut donc proposer la connexion LinkedIn en un tap plutôt que de
 * forcer l'ouverture dans un navigateur externe. Vérifié manuellement en staging.
 */
export function isLinkedInInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes(LINKEDIN_APP);
}
