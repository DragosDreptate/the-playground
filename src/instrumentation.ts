import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function onRequestError(...args: any[]) {
  Sentry.captureRequestError(...(args as Parameters<typeof Sentry.captureRequestError>));
}
