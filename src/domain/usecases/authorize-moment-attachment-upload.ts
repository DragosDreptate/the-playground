import { maxSizeForContentType } from "@/domain/models/moment-attachment";
import {
  assertCanAddMomentAttachment,
  type MomentAttachmentAuthDeps,
} from "./assert-can-add-moment-attachment";

/**
 * Authorizes a client-direct upload BEFORE the file leaves the browser:
 * checks the content type, the host permission and the per-moment limit, and
 * returns the size cap to enforce on the upload token.
 *
 * Mirrors the checks at confirmation time (addMomentAttachment), so a forbidden
 * or over-quota upload never starts.
 */
export async function authorizeMomentAttachmentUpload(
  input: { momentId: string; userId: string; contentType: string },
  deps: MomentAttachmentAuthDeps
): Promise<{ maxSizeBytes: number }> {
  await assertCanAddMomentAttachment(input, deps);
  return { maxSizeBytes: maxSizeForContentType(input.contentType) };
}
