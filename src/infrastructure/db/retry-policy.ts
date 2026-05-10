import { Prisma } from "@prisma/client";

export const MAX_RETRIES = 3;
export const BASE_DELAY_MS = 100;

const TRANSIENT_PATTERNS = [
  "Connection terminated unexpectedly",
  "Connection terminated due to connection timeout",
  "Connection refused",
  "connection timed out",
  "too many connections",
  "socket hang up",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "timeout exceeded when trying to connect",
  // Neon control plane hiccup (cold start, rolling deploy, transient saturation).
  // Substring matches "Control plane request failed" and any future variant.
  "Control plane",
];

const TRANSIENT_PRISMA_CODES = new Set([
  "P1008", // Operations timed out
  "P1011", // Error opening a TLS connection
  "P1015", // Can't reach database server
  "P1017", // Server has closed the connection
  "P2024", // Timed out fetching a new connection from the pool
]);

export const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

export function isTransientError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code);
  }
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_PATTERNS.some((p) => message.includes(p));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
