import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { __internal } from "../safe-resend";

const { parseAllowlist, isAllowedInStaging, normalizeRecipients } = __internal;

describe("parseAllowlist", () => {
  it("parses comma-separated emails, trims, lowercases", () => {
    expect(parseAllowlist(" Foo@Bar.com , baz@qux.io ")).toEqual([
      "foo@bar.com",
      "baz@qux.io",
    ]);
  });

  it("filters out empty entries", () => {
    expect(parseAllowlist("a@b.com,,,c@d.com")).toEqual(["a@b.com", "c@d.com"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseAllowlist("")).toEqual([]);
  });
});

describe("isAllowedInStaging", () => {
  describe("given an email in the explicit allowlist", () => {
    it("returns true (case-insensitive)", () => {
      expect(isAllowedInStaging("Dragos@Gmail.com", ["dragos@gmail.com"])).toBe(true);
    });
  });

  describe("given an email with @test.playground domain", () => {
    it("returns true", () => {
      expect(isAllowedInStaging("host@test.playground", [])).toBe(true);
      expect(isAllowedInStaging("player1@test.playground", [])).toBe(true);
    });
  });

  describe("given an email with @demo.playground domain", () => {
    it("returns true", () => {
      expect(isAllowedInStaging("demo@demo.playground", [])).toBe(true);
    });
  });

  describe("given a random email not in allowlist", () => {
    it("returns false even with a populated allowlist", () => {
      expect(isAllowedInStaging("random@gmail.com", ["dragos@gmail.com"])).toBe(false);
    });

    it("returns false with empty allowlist", () => {
      expect(isAllowedInStaging("random@gmail.com", [])).toBe(false);
    });
  });

  describe("given emails with similar suffixes but not matching", () => {
    it("does not match @nottest.playground or @test.playground.com", () => {
      expect(isAllowedInStaging("foo@nottest.playground", [])).toBe(false);
      expect(isAllowedInStaging("foo@test.playground.com", [])).toBe(false);
    });
  });
});

describe("normalizeRecipients", () => {
  it("wraps a single string in an array", () => {
    expect(normalizeRecipients("a@b.com")).toEqual(["a@b.com"]);
  });

  it("returns array as-is", () => {
    expect(normalizeRecipients(["a@b.com", "c@d.com"])).toEqual(["a@b.com", "c@d.com"]);
  });

  it("returns empty array for undefined", () => {
    expect(normalizeRecipients(undefined)).toEqual([]);
  });
});

// Mock the `resend` module so we can intercept actual API calls.
// The mock uses a class (not a vi.fn) because `new Resend()` needs a real constructor.
const mockSend = vi.fn();
const mockBatchSend = vi.fn();

vi.mock("resend", () => {
  class ResendMock {
    emails = { send: mockSend };
    batch = { send: mockBatchSend };
  }
  return { Resend: ResendMock };
});

import { createSafeResend } from "../safe-resend";

describe("createSafeResend — integration", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.IS_STAGING;
    delete process.env.STAGING_EMAIL_ALLOWLIST;
    mockSend.mockReset();
    mockSend.mockResolvedValue({ data: { id: "real-send" }, error: null });
    mockBatchSend.mockReset();
    mockBatchSend.mockResolvedValue({ data: { data: [{ id: "real-batch" }] }, error: null });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  describe("given IS_STAGING is not set (production mode)", () => {
    it("forwards all emails to Resend without checking", async () => {
      const resend = createSafeResend("re_fake");

      await resend.emails.send({
        from: "test@x.com",
        to: "random@gmail.com",
        subject: "hi",
        html: "<p>hi</p>",
      } as Parameters<typeof resend.emails.send>[0]);

      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend.mock.calls[0]![0]!.to).toBe("random@gmail.com");
    });
  });

  describe("given IS_STAGING=true with an allowlist", () => {
    beforeEach(() => {
      process.env.IS_STAGING = "true";
      process.env.STAGING_EMAIL_ALLOWLIST = "dragos@gmail.com";
    });

    it("allows an email in the allowlist", async () => {
      const resend = createSafeResend("re_fake");

      const result = await resend.emails.send({
        from: "test@x.com",
        to: "dragos@gmail.com",
        subject: "hi",
        html: "<p>hi</p>",
      } as Parameters<typeof resend.emails.send>[0]);

      expect(mockSend).toHaveBeenCalledOnce();
      expect(result?.data?.id).toBe("real-send");
    });

    it("allows a @test.playground email", async () => {
      const resend = createSafeResend("re_fake");

      await resend.emails.send({
        from: "test@x.com",
        to: "host@test.playground",
        subject: "hi",
        html: "<p>hi</p>",
      } as Parameters<typeof resend.emails.send>[0]);

      expect(mockSend).toHaveBeenCalledOnce();
    });

    it("blocks an email not in the allowlist", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const resend = createSafeResend("re_fake");

      const result = await resend.emails.send({
        from: "test@x.com",
        to: "random@gmail.com",
        subject: "hi",
        html: "<p>hi</p>",
      } as Parameters<typeof resend.emails.send>[0]);

      expect(mockSend).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(result?.data?.id).toBe("staging-guard-blocked");
    });

    it("blocks a batch if at least one recipient is not allowed", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const resend = createSafeResend("re_fake");

      await resend.emails.send({
        from: "test@x.com",
        to: ["dragos@gmail.com", "random@gmail.com"],
        subject: "hi",
        html: "<p>hi</p>",
      } as Parameters<typeof resend.emails.send>[0]);

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("given IS_STAGING=true with empty allowlist (fail-closed)", () => {
    beforeEach(() => {
      process.env.IS_STAGING = "true";
      process.env.STAGING_EMAIL_ALLOWLIST = "";
    });

    it("blocks non-@test/@demo emails", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const resend = createSafeResend("re_fake");

      await resend.emails.send({
        from: "test@x.com",
        to: "admin@the-playground.fr",
        subject: "hi",
        html: "<p>hi</p>",
      } as Parameters<typeof resend.emails.send>[0]);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("still allows @test.playground emails (auto-whitelist)", async () => {
      const resend = createSafeResend("re_fake");

      await resend.emails.send({
        from: "test@x.com",
        to: "player1@test.playground",
        subject: "hi",
        html: "<p>hi</p>",
      } as Parameters<typeof resend.emails.send>[0]);

      expect(mockSend).toHaveBeenCalledOnce();
    });
  });

  describe("batch.send — envois en masse", () => {
    describe("given IS_STAGING is not set (production mode)", () => {
      it("forwards the batch as-is", async () => {
        const resend = createSafeResend("re_fake");

        await resend.batch.send([
          { from: "x@y.com", to: "random@gmail.com", subject: "a", html: "<p>a</p>" },
          { from: "x@y.com", to: "other@gmail.com", subject: "b", html: "<p>b</p>" },
        ] as Parameters<typeof resend.batch.send>[0]);

        expect(mockBatchSend).toHaveBeenCalledOnce();
        const batchArg = mockBatchSend.mock.calls[0]![0]!;
        expect(batchArg).toHaveLength(2);
      });
    });

    describe("given IS_STAGING=true with an allowlist", () => {
      beforeEach(() => {
        process.env.IS_STAGING = "true";
        process.env.STAGING_EMAIL_ALLOWLIST = "dragos@gmail.com";
      });

      it("filters out emails to non-allowed recipients", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const resend = createSafeResend("re_fake");

        await resend.batch.send([
          { from: "x@y.com", to: "dragos@gmail.com", subject: "keep", html: "<p>a</p>" },
          { from: "x@y.com", to: "random@gmail.com", subject: "drop", html: "<p>b</p>" },
          { from: "x@y.com", to: "player1@test.playground", subject: "keep", html: "<p>c</p>" },
        ] as Parameters<typeof resend.batch.send>[0]);

        expect(mockBatchSend).toHaveBeenCalledOnce();
        const batchArg = mockBatchSend.mock.calls[0]![0]! as Array<{ subject: string }>;
        expect(batchArg).toHaveLength(2);
        expect(batchArg.map((e) => e.subject)).toEqual(["keep", "keep"]);
      });

      it("does not call Resend at all if all emails are blocked", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const resend = createSafeResend("re_fake");

        await resend.batch.send([
          { from: "x@y.com", to: "random1@gmail.com", subject: "a", html: "<p>a</p>" },
          { from: "x@y.com", to: "random2@gmail.com", subject: "b", html: "<p>b</p>" },
        ] as Parameters<typeof resend.batch.send>[0]);

        expect(mockBatchSend).not.toHaveBeenCalled();
      });

      it("logs the blocked recipients", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const resend = createSafeResend("re_fake");

        await resend.batch.send([
          { from: "x@y.com", to: "random@gmail.com", subject: "a", html: "<p>a</p>" },
        ] as Parameters<typeof resend.batch.send>[0]);

        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0]![0]).toContain("[staging-guard] Blocked batch");
      });
    });

    describe("given IS_STAGING=true with empty allowlist (fail-closed)", () => {
      beforeEach(() => {
        process.env.IS_STAGING = "true";
        process.env.STAGING_EMAIL_ALLOWLIST = "";
      });

      it("blocks all non-@test/@demo emails in the batch", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const resend = createSafeResend("re_fake");

        await resend.batch.send([
          { from: "x@y.com", to: "admin@the-playground.fr", subject: "a", html: "<p>a</p>" },
          { from: "x@y.com", to: "demo@demo.playground", subject: "b", html: "<p>b</p>" },
        ] as Parameters<typeof resend.batch.send>[0]);

        expect(mockBatchSend).toHaveBeenCalledOnce();
        const batchArg = mockBatchSend.mock.calls[0]![0]! as Array<{ to: string }>;
        expect(batchArg).toHaveLength(1);
        expect(batchArg[0]!.to).toBe("demo@demo.playground");
      });
    });
  });
});
