import { describe, it, expect, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { createFastTextCall, FAST_MODEL } from "@/infrastructure/services/ai/fast-model";

function clientReturning(message: Partial<Anthropic.Messages.Message>) {
  const create = vi.fn().mockResolvedValue(message);
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe("createFastTextCall", () => {
  describe("given a normal answer", () => {
    it("should send the shared model and its settings, and return the text", async () => {
      const { client, create } = clientReturning({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "{\"ok\":true}", citations: null }],
      });

      const text = await createFastTextCall(client)("prompt", 300);

      expect(text).toBe("{\"ok\":true}");
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ model: FAST_MODEL.model, max_tokens: 300, ...FAST_MODEL.params })
      );
    });
  });

  describe("given a safety refusal", () => {
    it("should return null so that every caller falls back", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { client } = clientReturning({
        stop_reason: "refusal",
        content: [{ type: "text", text: "partial", citations: null }],
      });

      expect(await createFastTextCall(client)("prompt", 300)).toBeNull();
    });
  });

  describe("given an answer without a text block", () => {
    it("should return null", async () => {
      const { client } = clientReturning({ stop_reason: "max_tokens", content: [] });

      expect(await createFastTextCall(client)("prompt", 300)).toBeNull();
    });
  });
});
