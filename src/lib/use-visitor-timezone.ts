"use client";

import { useEffect, useState } from "react";

/**
 * Fuseau du visiteur, disponible **après montage seulement**.
 *
 * Renvoie `null` au premier rendu — y compris côté client pendant l'hydratation —
 * puis le fuseau réel. Ce délai est délibéré, pas une limitation :
 *
 * Les pages publiques sont servies en ISR (30 s sur la page événement, jusqu'à 300 s
 * sur Explorer). Un HTML mis en cache est partagé par tous les visiteurs : il ne peut
 * pas contenir une heure propre à l'un d'eux. Lire le fuseau au rendu produirait un
 * HTML serveur (fuseau du serveur, UTC) différent du rendu client, donc un mismatch
 * d'hydratation — le piège qui a déjà fait trois allers-retours sur le badge
 * « Aujourd'hui » en juillet 2026.
 *
 * Les appelants rendent donc l'heure de l'événement tant que le fuseau est `null`,
 * puis basculent sur celle du visiteur. Quand les deux coïncident — le cas courant —
 * rien ne bouge à l'écran.
 *
 * Voir spec/decisions/0008-fuseau-horaire-affichage-visiteur.md
 */
export function useVisitorTimezone(): string | null {
  const [timezone, setTimezone] = useState<string | null>(null);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return timezone;
}
