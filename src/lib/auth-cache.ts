import { cache } from "react";
import { auth } from "@/infrastructure/auth/auth.config";

/**
 * Version mise en cache de auth() pour les React Server Components.
 * React déduplique automatiquement les appels dans le même arbre de rendu RSC,
 * évitant les N+1 queries quand plusieurs layouts/pages imbriqués appellent auth().
 */
export const getCachedSession = cache(auth);
