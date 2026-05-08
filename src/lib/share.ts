export type ShareOutcome = "shared" | "cancelled" | "unsupported" | "error";

function defaultNavigator(): Navigator | undefined {
  return typeof navigator !== "undefined" ? navigator : undefined;
}

export function isShareSupported(nav: Navigator | undefined = defaultNavigator()): boolean {
  return typeof nav?.share === "function";
}

export async function tryShare(
  url: string,
  nav: Navigator | undefined = defaultNavigator(),
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
