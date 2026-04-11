import type { MomentAttachment } from "@/domain/models/moment-attachment";

export type CreateMomentAttachmentInput = {
  momentId: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export interface MomentAttachmentRepository {
  create(input: CreateMomentAttachmentInput): Promise<MomentAttachment>;
  findById(id: string): Promise<MomentAttachment | null>;
  findByMoment(momentId: string): Promise<MomentAttachment[]>;
  countByMoment(momentId: string): Promise<number>;
  delete(id: string): Promise<void>;
}
