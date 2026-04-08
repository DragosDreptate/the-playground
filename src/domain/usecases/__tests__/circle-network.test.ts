import { describe, it, expect, vi } from "vitest";
import { getNetworkBySlug } from "@/domain/usecases/get-network-by-slug";
import { getNetworksByCircleId } from "@/domain/usecases/get-networks-by-circle-id";
import { getAdminNetworks } from "@/domain/usecases/admin/get-admin-networks";
import { adminCreateNetwork } from "@/domain/usecases/admin/admin-create-network";
import { adminUpdateNetwork } from "@/domain/usecases/admin/admin-update-network";
import { adminDeleteNetwork } from "@/domain/usecases/admin/admin-delete-network";
import { adminAddCircleToNetwork } from "@/domain/usecases/admin/admin-add-circle-to-network";
import { adminRemoveCircleFromNetwork } from "@/domain/usecases/admin/admin-remove-circle-from-network";
import { AdminUnauthorizedError } from "@/domain/errors";
import {
  createMockCircleNetworkRepository,
  makeNetwork,
  makeNetworkWithCircles,
} from "./helpers/mock-circle-network-repository";

describe("getNetworkBySlug", () => {
  describe("given a slug that exists", () => {
    it("should return the network with circles", async () => {
      const network = makeNetworkWithCircles({ slug: "my-network" });
      const repo = createMockCircleNetworkRepository({
        findBySlug: vi.fn().mockResolvedValue(network),
      });

      const result = await getNetworkBySlug("my-network", {
        circleNetworkRepository: repo,
      });

      expect(result).not.toBeNull();
      expect(result!.slug).toBe("my-network");
    });
  });

  describe("given a slug that does not exist", () => {
    it("should return null", async () => {
      const repo = createMockCircleNetworkRepository({
        findBySlug: vi.fn().mockResolvedValue(null),
      });

      const result = await getNetworkBySlug("non-existent", {
        circleNetworkRepository: repo,
      });

      expect(result).toBeNull();
    });
  });
});

describe("getNetworksByCircleId", () => {
  it("should return the networks for a circle", async () => {
    const networks = [
      makeNetwork({ id: "n1", name: "Network A" }),
      makeNetwork({ id: "n2", name: "Network B" }),
    ];
    const repo = createMockCircleNetworkRepository({
      findNetworksByCircleId: vi.fn().mockResolvedValue(networks),
    });

    const result = await getNetworksByCircleId("circle-1", {
      circleNetworkRepository: repo,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Network A");
  });
});

describe("Admin network usecases", () => {
  describe("getAdminNetworks", () => {
    it("should return all networks for ADMIN", async () => {
      const networks = [
        { ...makeNetwork(), circleCount: 3 },
      ];
      const repo = createMockCircleNetworkRepository({
        findAll: vi.fn().mockResolvedValue(networks),
      });

      const result = await getAdminNetworks("ADMIN", {
        circleNetworkRepository: repo,
      });

      expect(result).toHaveLength(1);
      expect(result[0].circleCount).toBe(3);
    });

    it("should throw AdminUnauthorizedError for non-ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await expect(
        getAdminNetworks("USER", { circleNetworkRepository: repo })
      ).rejects.toThrow(AdminUnauthorizedError);
    });
  });

  describe("adminCreateNetwork", () => {
    it("should create a network for ADMIN", async () => {
      const created = makeNetwork({ name: "New Network", slug: "new-network" });
      const repo = createMockCircleNetworkRepository({
        create: vi.fn().mockResolvedValue(created),
      });

      const result = await adminCreateNetwork(
        "ADMIN",
        { name: "New Network", slug: "new-network" },
        { circleNetworkRepository: repo }
      );

      expect(result.name).toBe("New Network");
      expect(repo.create).toHaveBeenCalledWith({
        name: "New Network",
        slug: "new-network",
      });
    });

    it("should throw AdminUnauthorizedError for non-ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await expect(
        adminCreateNetwork("USER", { name: "X", slug: "x" }, { circleNetworkRepository: repo })
      ).rejects.toThrow(AdminUnauthorizedError);
    });
  });

  describe("adminUpdateNetwork", () => {
    it("should update a network for ADMIN", async () => {
      const updated = makeNetwork({ name: "Updated" });
      const repo = createMockCircleNetworkRepository({
        update: vi.fn().mockResolvedValue(updated),
      });

      const result = await adminUpdateNetwork(
        "ADMIN",
        "network-1",
        { name: "Updated" },
        { circleNetworkRepository: repo }
      );

      expect(result.name).toBe("Updated");
    });

    it("should throw AdminUnauthorizedError for non-ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await expect(
        adminUpdateNetwork("USER", "network-1", { name: "X" }, { circleNetworkRepository: repo })
      ).rejects.toThrow(AdminUnauthorizedError);
    });
  });

  describe("adminDeleteNetwork", () => {
    it("should delete a network for ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await adminDeleteNetwork("ADMIN", "network-1", {
        circleNetworkRepository: repo,
      });

      expect(repo.delete).toHaveBeenCalledWith("network-1");
    });

    it("should throw AdminUnauthorizedError for non-ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await expect(
        adminDeleteNetwork("USER", "network-1", { circleNetworkRepository: repo })
      ).rejects.toThrow(AdminUnauthorizedError);
    });
  });

  describe("adminAddCircleToNetwork", () => {
    it("should add a circle for ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await adminAddCircleToNetwork("ADMIN", "network-1", "circle-1", {
        circleNetworkRepository: repo,
      });

      expect(repo.addCircle).toHaveBeenCalledWith("network-1", "circle-1");
    });

    it("should throw AdminUnauthorizedError for non-ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await expect(
        adminAddCircleToNetwork("USER", "network-1", "circle-1", {
          circleNetworkRepository: repo,
        })
      ).rejects.toThrow(AdminUnauthorizedError);
    });
  });

  describe("adminRemoveCircleFromNetwork", () => {
    it("should remove a circle for ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await adminRemoveCircleFromNetwork("ADMIN", "network-1", "circle-1", {
        circleNetworkRepository: repo,
      });

      expect(repo.removeCircle).toHaveBeenCalledWith("network-1", "circle-1");
    });

    it("should throw AdminUnauthorizedError for non-ADMIN", async () => {
      const repo = createMockCircleNetworkRepository();

      await expect(
        adminRemoveCircleFromNetwork("USER", "network-1", "circle-1", {
          circleNetworkRepository: repo,
        })
      ).rejects.toThrow(AdminUnauthorizedError);
    });
  });
});
