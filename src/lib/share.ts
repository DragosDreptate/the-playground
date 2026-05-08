export type ShareOutcome = "shared" | "cancelled" | "unsupported" | "error";

export function isShareSupported(nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined): boolean {
  return typeof nav?.share === "function";
}

export async function tryShare(
  url: string,
  nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined,
): Promise<ShareOutcome> {
  if (!isShareSupported(nav)) return "unsupported";

  try {
    await nav!.share({ url });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
    return "error";
  }
}
