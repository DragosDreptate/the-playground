/**
 * Auto-inscription post-auth : un visiteur non connecté qui clique « S'inscrire »
 * (événement) ou « Rejoindre » (Communauté) doit, après authentification, être
 * inscrit automatiquement au retour, sans re-cliquer.
 *
 * L'intention voyage dans le `callbackUrl` via le marqueur `?join=1` (et non
 * `autojoin`, terme déjà employé dans le domaine pour l'adhésion Circle
 * automatique via inscription événement). Au retour, le bouton concerné lit le
 * marqueur et déclenche la même action que le clic (cf. `useAutoJoin`).
 */
export const AUTO_JOIN_PARAM = "join";

/** Ajoute le marqueur d'intention d'inscription à un path (sans query existant). */
export function withAutoJoin(path: string): string {
  return `${path}?${AUTO_JOIN_PARAM}=1`;
}

/**
 * Éligibilité à l'auto-inscription post-auth, vue côté bouton :
 * - `isAuthenticated` : la session est établie (au retour post-auth, toujours vrai) ;
 * - `alreadyEngaged` : déjà inscrit / membre / en attente de validation → ne rien faire ;
 * - `blocked` : raison d'exclure (ex. événement payant → passe par Stripe, pas d'auto-paiement).
 */
export function canAutoJoin(opts: {
  isAuthenticated: boolean;
  alreadyEngaged: boolean;
  blocked: boolean;
}): boolean {
  return opts.isAuthenticated && !opts.alreadyEngaged && !opts.blocked;
}
