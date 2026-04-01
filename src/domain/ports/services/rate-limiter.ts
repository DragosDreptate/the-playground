export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export interface RateLimiter {
  checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult>;

  /** Purge les entrées dont la fenêtre est expirée. */
  purgeExpired(maxAgeMs: number): Promise<number>;
}
