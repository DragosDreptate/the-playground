/**
 * Place le participant de l'utilisateur courant en tête de liste.
 * L'ordre relatif des autres participants est préservé.
 * Retourne la liste inchangée si `currentUserId` est null ou si l'utilisateur n'est pas dans la liste.
 */
export function promoteCurrentUserFirst<T extends { userId: string }>(
  participants: T[],
  currentUserId: string | null | undefined,
): T[] {
  if (!currentUserId) return participants;
  const idx = participants.findIndex((p) => p.userId === currentUserId);
  if (idx <= 0) return participants;
  return [participants[idx]!, ...participants.slice(0, idx), ...participants.slice(idx + 1)];
}
