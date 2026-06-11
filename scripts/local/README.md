# scripts/local — scripts de debug locaux (non versionnés)

Ce dossier accueille les scripts de debug/investigation ponctuels qui
manipulent des **données sensibles** : emails réels d'utilisateurs, IDs de
production, traces de parcours nominatives, etc.

## Règle

- Le contenu de ce dossier est **gitignored** (sauf ce README).
- **Aucun script avec une donnée personnelle réelle en dur ne doit être
  committé** dans le repo public (`scripts/`, `spec/`, code, commentaires).
- Pour un script destiné à rester versionné, **paramétrer** les valeurs
  sensibles via `process.env` ou des arguments CLI, jamais en dur.

## Pourquoi

Le dépôt est **public**. Tout email ou nom réel committé devient une donnée
personnelle exposée et indexable (non-conformité RGPD), y compris dans
l'historique git que l'anonymisation a posteriori ne purge pas.

## Exécution

```bash
pnpm tsx scripts/local/mon-script.ts
```
