import type { Circle, CircleMembership, CircleMemberRole, CircleMemberWithUser, CircleWithRole } from "@/domain/models/circle";

export type CreateCircleInput = {
  name: string;
  slug: string;
  description: string;
  visibility: Circle["visibility"];
};

export type UpdateCircleInput = {
  name?: string;
  description?: string;
  visibility?: Circle["visibility"];
};

export interface CircleRepository {
  create(input: CreateCircleInput): Promise<Circle>;
  findById(id: string): Promise<Circle | null>;
  findBySlug(slug: string): Promise<Circle | null>;
  findByUserId(userId: string, role: CircleMemberRole): Promise<Circle[]>;
  update(id: string, input: UpdateCircleInput): Promise<Circle>;
  delete(id: string): Promise<void>;
  slugExists(slug: string): Promise<boolean>;
  addMembership(circleId: string, userId: string, role: CircleMemberRole): Promise<CircleMembership>;
  findAllByUserId(userId: string): Promise<CircleWithRole[]>;
  findMembership(circleId: string, userId: string): Promise<CircleMembership | null>;
  findMembersByRole(circleId: string, role: CircleMemberRole): Promise<CircleMemberWithUser[]>;
  countMembers(circleId: string): Promise<number>;
}
