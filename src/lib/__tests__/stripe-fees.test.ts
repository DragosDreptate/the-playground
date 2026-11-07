import { describe, it, expect } from "vitest";
import { estimateNetAfterStripeFees } from "../stripe-fees";

describe("estimateNetAfterStripeFees", () => {
  it.each([
    [1500, 1452],
    [3500, 3422],
    [50, 24],
    [10, 0],
  ])("should estimate the net of %i cents at %i cents", (cents, net) => {
    expect(estimateNetAfterStripeFees(cents)).toBe(net);
  });
});
