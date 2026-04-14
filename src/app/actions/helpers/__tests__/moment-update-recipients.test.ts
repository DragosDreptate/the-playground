import { describe, it, expect } from "vitest";
import { partitionMomentUpdateRecipients } from "../moment-update-recipients";
import type { RegistrationWithUser } from "@/domain/models/registration";
import type { CircleMemberWithUser } from "@/domain/models/circle";

function makeRegistration(overrides: {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): RegistrationWithUser {
  return {
    id: `reg-${overrides.userId}`,
    momentId: "moment-1",
    userId: overrides.userId,
    status: "REGISTERED",
    paymentStatus: "NONE",
    stripePaymentIntentId: null,
    stripeReceiptUrl: null,
    registeredAt: new Date("2026-04-01T10:00:00Z"),
    cancelledAt: null,
    checkedInAt: null,
    user: {
      id: overrides.userId,
      firstName: overrides.firstName ?? null,
      lastName: overrides.lastName ?? null,
      email: overrides.email,
      image: null,
      publicId: null,
    },
  };
}

function makeHost(overrides: {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): CircleMemberWithUser {
  return {
    id: `mem-${overrides.userId}`,
    userId: overrides.userId,
    circleId: "circle-1",
    role: "HOST",
    status: "ACTIVE",
    joinedAt: new Date("2026-03-01T10:00:00Z"),
    user: {
      id: overrides.userId,
      firstName: overrides.firstName ?? null,
      lastName: overrides.lastName ?? null,
      email: overrides.email,
      image: null,
      publicId: null,
    },
  };
}

describe("partitionMomentUpdateRecipients", () => {
  describe("given a Host is also registered as a participant", () => {
    it("should exclude the Host from the participants batch so they receive only the Host version", () => {
      const host = makeHost({ userId: "user-host", email: "host@example.com" });
      const registrations = [
        makeRegistration({ userId: "user-host", email: "host@example.com" }),
        makeRegistration({ userId: "user-alice", email: "alice@example.com" }),
      ];

      const { participants, hosts } = partitionMomentUpdateRecipients(
        registrations,
        [host]
      );

      expect(participants.map((p) => p.to)).toEqual(["alice@example.com"]);
      expect(hosts.map((h) => h.to)).toEqual(["host@example.com"]);
    });
  });

  describe("given participants who are not Hosts", () => {
    it("should include all of them in the participants batch", () => {
      const host = makeHost({ userId: "user-host", email: "host@example.com" });
      const registrations = [
        makeRegistration({ userId: "user-alice", email: "alice@example.com" }),
        makeRegistration({ userId: "user-bob", email: "bob@example.com" }),
      ];

      const { participants, hosts } = partitionMomentUpdateRecipients(
        registrations,
        [host]
      );

      expect(participants.map((p) => p.to).sort()).toEqual([
        "alice@example.com",
        "bob@example.com",
      ]);
      expect(hosts.map((h) => h.to)).toEqual(["host@example.com"]);
    });
  });

  describe("given multiple Hosts in the Circle", () => {
    it("should exclude every Host userId from the participants batch", () => {
      const hostA = makeHost({ userId: "user-host-a", email: "a@example.com" });
      const hostB = makeHost({ userId: "user-host-b", email: "b@example.com" });
      const registrations = [
        makeRegistration({ userId: "user-host-a", email: "a@example.com" }),
        makeRegistration({ userId: "user-host-b", email: "b@example.com" }),
        makeRegistration({ userId: "user-alice", email: "alice@example.com" }),
      ];

      const { participants, hosts } = partitionMomentUpdateRecipients(
        registrations,
        [hostA, hostB]
      );

      expect(participants.map((p) => p.to)).toEqual(["alice@example.com"]);
      expect(hosts.map((h) => h.to).sort()).toEqual([
        "a@example.com",
        "b@example.com",
      ]);
    });
  });

  describe("given no registered participants", () => {
    it("should return empty participants and still expose Hosts", () => {
      const host = makeHost({ userId: "user-host", email: "host@example.com" });

      const { participants, hosts } = partitionMomentUpdateRecipients([], [host]);

      expect(participants).toEqual([]);
      expect(hosts.map((h) => h.to)).toEqual(["host@example.com"]);
    });
  });
});
