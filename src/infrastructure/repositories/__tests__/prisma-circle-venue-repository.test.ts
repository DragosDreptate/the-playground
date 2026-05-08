import { describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();
const update = vi.fn();

vi.mock("@/infrastructure/db/prisma", () => ({
  prisma: {
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        circleVenue: { update },
        moment: { updateMany },
      }),
  },
}));

describe("prismaCircleVenueRepository", () => {
  it("updates future moment location snapshots when a venue changes", async () => {
    const updatedVenue = {
      id: "venue-1",
      circleId: "circle-1",
      name: "New Venue",
      address: "New address",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
    };
    update.mockResolvedValue(updatedVenue);
    updateMany.mockResolvedValue({ count: 2 });

    const { prismaCircleVenueRepository } = await import(
      "@/infrastructure/repositories/prisma-circle-venue-repository"
    );

    const result = await prismaCircleVenueRepository.update("venue-1", {
      name: "New Venue",
      address: "New address",
    });

    expect(result.name).toBe("New Venue");
    expect(update).toHaveBeenCalledWith({
      where: { id: "venue-1" },
      data: { name: "New Venue", address: "New address" },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        circleVenueId: "venue-1",
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
      data: {
        locationName: "New Venue",
        locationAddress: "New address",
      },
    });
  });
});
