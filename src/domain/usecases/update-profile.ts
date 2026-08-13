import type { User } from "@/domain/models/user";
import type {
  UserRepository,
  UpdateProfileInput,
} from "@/domain/ports/repositories/user-repository";
import { BioTooLongError, UserNotFoundError } from "@/domain/errors";
import { exceedsCharacterCap, normalizeLineBreaks } from "@/lib/text";

/**
 * Longueur maximale de la bio, en caractères au sens de Postgres. Doit rester
 * alignée sur la largeur de la colonne `User.bio` (`@db.VarChar(160)`) — un
 * test épingle les deux valeurs l'une à l'autre. Partagée avec le formulaire
 * pour que le compteur affiché et la validation serveur ne divergent pas.
 */
export const BIO_MAX_LENGTH = 160;

type UpdateProfileUseCaseInput = {
  userId: string;
  firstName: string;
  lastName: string;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  city?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
};

type UpdateProfileDeps = {
  userRepository: UserRepository;
};

export async function updateProfile(
  input: UpdateProfileUseCaseInput,
  deps: UpdateProfileDeps
): Promise<User> {
  const { userRepository } = deps;

  // Les retours à la ligne d'un formulaire HTML arrivent en `\r\n` alors que le
  // navigateur les a comptés en `\n` : sans normalisation, une bio affichée sous
  // la limite arrive au-dessus et la colonne la rejette.
  const bio =
    typeof input.bio === "string" ? normalizeLineBreaks(input.bio) : input.bio;

  if (bio != null && exceedsCharacterCap(bio, BIO_MAX_LENGTH)) {
    throw new BioTooLongError(BIO_MAX_LENGTH);
  }

  const user = await userRepository.findById(input.userId);

  if (!user) {
    throw new UserNotFoundError(input.userId);
  }

  const profileInput: UpdateProfileInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.image !== undefined && { image: input.image }),
    ...(bio !== undefined && { bio }),
    ...(input.city !== undefined && { city: input.city }),
    ...(input.website !== undefined && { website: input.website }),
    ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
    ...(input.twitterUrl !== undefined && { twitterUrl: input.twitterUrl }),
    ...(input.githubUrl !== undefined && { githubUrl: input.githubUrl }),
  };

  return userRepository.updateProfile(input.userId, profileInput);
}
