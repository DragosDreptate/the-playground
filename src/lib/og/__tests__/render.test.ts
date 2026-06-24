import { describe, it, expect, beforeAll, vi } from "vitest";
import sharp from "sharp";

// Mock next/og : on isole la logique du helper (compression + en-têtes +
// fallback) sans payer le rendu Satori/resvg. `arrayBuffer()` renvoie les
// octets que l'on injecte par test.
const ogBytes = vi.hoisted(
  () => ({ current: new Uint8Array() }) as { current: Uint8Array<ArrayBufferLike> },
);

vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(
      public element: unknown,
      public options: unknown,
    ) {}
    arrayBuffer() {
      return Promise.resolve(ogBytes.current.buffer);
    }
  },
}));

import { ogJpegResponse, ogFallbackResponse } from "../render";

const element = null as never;
const size = { width: 1200, height: 1200 };

describe("ogJpegResponse", () => {
  it("sert un JPEG avec cache-control et SANS Content-Length", async () => {
    const res = ogJpegResponse(Buffer.from([1, 2, 3, 4]));

    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate");
    // Garde anti-régression : surtout PAS de Content-Length, sinon le CDN
    // tronque la réponse aux 32 Ko du Range de Slack.
    expect(res.headers.get("content-length")).toBeNull();

    const body = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(body)).toEqual([1, 2, 3, 4]);
  });
});

describe("ogFallbackResponse", () => {
  describe("given un rendu Satori valide", () => {
    let realPng: Uint8Array;

    beforeAll(async () => {
      const buf = await sharp({
        create: { width: 4, height: 4, channels: 3, background: "#888" },
      })
        .png()
        .toBuffer();
      realPng = new Uint8Array(buf.length);
      realPng.set(buf);
    });

    it("re-encode en JPEG (magic bytes FF D8 FF)", async () => {
      ogBytes.current = realPng;
      const res = await ogFallbackResponse(element, size);

      expect(res.headers.get("content-type")).toBe("image/jpeg");
      const out = new Uint8Array(await res.arrayBuffer());
      expect(out[0]).toBe(0xff);
      expect(out[1]).toBe(0xd8);
      expect(out[2]).toBe(0xff);
    });
  });

  describe("given un re-encodage qui échoue (octets non décodables)", () => {
    it("retombe sur le PNG brut plutôt qu'un 500", async () => {
      const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      ogBytes.current = garbage;

      const res = await ogFallbackResponse(element, size);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      const out = new Uint8Array(await res.arrayBuffer());
      expect(Array.from(out)).toEqual(Array.from(garbage));
    });
  });
});
