import { describe, it, expect } from "vitest";
import { runEachGroup } from "../run-each-group";

describe("runEachGroup", () => {
  describe("given one group fails among others", () => {
    it("should process every group and return successes and errors without throwing", async () => {
      const processed: string[] = [];

      const result = await runEachGroup(["fr", "en", "nl"], async (g) => {
        processed.push(g);
        if (g === "en") throw new Error("boom");
      });

      expect(processed).toEqual(["fr", "en", "nl"]);
      expect(result.succeeded).toEqual(["fr", "nl"]);
      expect(result.errors.map((e) => (e as Error).message)).toEqual(["boom"]);
    });
  });
});

describe("runEachGroup with a pause between groups", () => {
  it("should wait between groups but never before the first one", async () => {
    const startedAt: number[] = [];
    const t0 = Date.now();

    await runEachGroup(["fr", "en"], async () => {
      startedAt.push(Date.now() - t0);
    }, { pauseBetweenMs: 50 });

    expect(startedAt[0]).toBeLessThan(40);
    expect(startedAt[1]).toBeGreaterThanOrEqual(45);
  });
});
