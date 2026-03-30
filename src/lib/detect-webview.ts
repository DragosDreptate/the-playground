/**
 * Detects in-app browsers (WebViews) from LinkedIn, Instagram, Facebook, WhatsApp, etc.
 * Google blocks OAuth from these browsers with `Error 403: disallowed_useragent`.
 */

const WEBVIEW_PATTERNS = [
  "FBAN", // Facebook App
  "FBAV", // Facebook App (version)
  "Instagram",
  "LinkedInApp",
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
