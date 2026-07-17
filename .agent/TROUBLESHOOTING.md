# Problèmes connus

## Runtimes indisponibles dans l'environnement de validation

- Date : 2026-07-17
- Commande initiale : `bun -e ... && bunx prettier --check ...`
- Résultat : `/bin/bash: bun: command not found`
- Tentative de repli : validation avec `node -e ...`
- Résultat : `/bin/bash: node: command not found`
- Impact : le formatage Prettier et les scripts Bun/Node.js ne peuvent pas être exécutés dans cette session.
- Contournement appliqué : validation de `config.json` avec `jq`, contrôle de la structure `.agent`, de la sentinelle et des espaces avec `git diff --check`.
- Résolution attendue : installer ou exposer Bun et/ou Node.js dans le `PATH`, puis relancer les contrôles de la phase 1.
