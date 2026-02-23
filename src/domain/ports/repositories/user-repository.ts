import type { User } from "@/domain/models/user";

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  name?: string | null;
  image?: string | null;
};

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  updateProfile(id: string, input: UpdateProfileInput): Promise<User>;
  delete(id: string): Promise<void>;
}
