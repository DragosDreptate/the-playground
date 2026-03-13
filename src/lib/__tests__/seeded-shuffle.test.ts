import { describe, it, expect } from "vitest";
import { seededShuffle } from "@/lib/seeded-shuffle";

describe("seededShuffle", () => {
  it("should return same order for same seed", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const seed = "2026-03-13";

    const first = seededShuffle(arr, seed);
    const second = seededShuffle(arr, seed);

    expect(first).toEqual(second);
  });

  it("should return different order for different seeds", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const resultA = seededShuffle(arr, "2026-03-13");
    const resultB = seededShuffle(arr, "2026-03-14");

    // Très improbable que deux seeds différents donnent exactement le même ordre
    expect(resultA).not.toEqual(resultB);
  });

  it("should not modify the original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];

    seededShuffle(arr, "2026-03-13");

    expect(arr).toEqual(original);
  });

  it("should handle empty array", () => {
    const result = seededShuffle([], "2026-03-13");
    expect(result).toEqual([]);
  });

  it("should handle single element array", () => {
    const result = seededShuffle(["only"], "2026-03-13");
    expect(result).toEqual(["only"]);
  });

  it("should contain all original elements after shuffle", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const result = seededShuffle(arr, "2026-03-13");

    expect(result).toHaveLength(arr.length);
    expect(result.sort()).toEqual([...arr].sort());
  });
});
