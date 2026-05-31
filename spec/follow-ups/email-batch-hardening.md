# Follow-ups : durcissement des batches email

Suite à l'incident 2026-05-31 (5/39 emails de notification de commentaire partis sur l'événement « Soirée Tremplin »), le fix immédiat a corrigé la racine du bug pour le flow commentaire (`sendCommentNotifications` dans `comment.ts`). Trois familles de bugs préexistants restent à traiter dans des PRs dédiées.

## 1. Visibilité Sentry sur les erreurs métier Resend (transverse)

**Symptôme** : `sendBatch` privé (`src/infrastructure/services/email/resend-email-service.ts`) appelle `resend.batch.send` qui peut renvoyer `{ data: null, error }` sur erreur métier (rate-limit, quota, validation). Aujourd'hui le retour est ignoré. Les 7 callers (`sendNewMomentToMembers`, `sendMomentUpdateBatch`, `sendMomentCancelledBatch`, `sendBroadcastMoments`, `sendCircleInvitations`, `sendRegistrationReminderBatch`, `sendNewCommentBatch`) ne savent jamais qu'un envoi a échoué côté Resend.

**Difficulté** : modifier `sendBatch` pour throw sur error casse des comportements en cascade chez les callers (cf. boucle `for(moments)` du cron `send-reminders` qui s'arrête au throw → doublons). Il faut soit :
- propager les erreurs par valeur de retour (`{ sent, failed, errors }`) plutôt que throw, puis adapter chaque caller pour décider de son comportement
- ou laisser `sendBatch` silencieux et faire la vérification dans CHAQUE caller individuellement

**Priorité** : moyenne. La visibilité ops est dégradée mais la solution actuelle (`Promise.all` de singles) avait le même angle mort.

## 2. `after()` manquant sur d'autres fire-and-forget

**Symptôme** : plusieurs Server Actions dispatchent un envoi email/notif sans `after()` :
- `src/app/actions/registration.ts` — commentaire explicite « Pas de after() » à corriger
- `src/app/actions/broadcast-moment.ts` — dispatche `sendBroadcastMoments` en `.catch(Sentry)`
- `src/app/actions/notify-host-new-circle-member.ts`
- `src/app/actions/circle.ts` (certains usages)

**Impact** : sur Vercel Fluid Compute, l'instance peut suspendre la fonction avant la fin du dispatch → même incident que `comment.ts` 2026-05-31 mais pour d'autres types de notif.

**Priorité** : moyenne à haute selon le volume (broadcast = potentiellement des centaines de destinataires).

## 3. Couplage entre deux batches successifs

**Symptôme** : `src/app/actions/moment.ts` enchaîne `sendMomentUpdateBatch(participants)` puis `sendMomentUpdateBatch(hosts)` en `await` séquentiel. Si le premier rejette, le second n'est jamais appelé. Si on ajoute un throw sur erreur Resend (cf. point 1), l'asymétrie devient plus visible.

**Fix** : `Promise.allSettled` au lieu de séquentiel, ou try/catch indépendant.

**Priorité** : faible (dépendant du point 1).

## 4. Slack inconsistency dans `sendCommentNotifications`

**Symptôme** : `notifySlackNewComment` est skippé quand `recipientMap.size === 0` (early return) mais envoyé quand `recipients.length === 0` après filtre prefs. Slack est un canal interne — devrait être notifié dans les deux cas.

**Fix** : déplacer `notifySlackNewComment` AVANT l'early return, ou retirer l'early return.

**Priorité** : faible (cas rare : event sans aucun autre membre que le commenter).

## 5. broadcast-moment cooldown 24h potentiellement locké sans envoi

**Symptôme** : `markBroadcastSent` est appelé AVANT `sendBroadcastMoments`. Si l'envoi échoue silencieusement (aujourd'hui) ou throw (futur si point 1 est traité), le Host est bloqué 24h sans aucun email envoyé et sans recours UI.

**Fix** : marker APRÈS l'envoi réussi, ou ajouter une voie de recours explicite.

**Priorité** : moyenne (impact UX direct sur les Organisateurs).
