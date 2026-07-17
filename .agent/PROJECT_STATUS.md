# État du projet

- Projet : `create-next-pro-cli`
- Date d'initialisation du contexte : 2026-07-17
- Phase courante : Phase 1 — Audit et socle fiable du CLI
- Statut : terminée et validée le 2026-07-17
- Progression : 4 sous-phases terminées, 16 marqueurs démarrage/validation complétés
- Tâches prévues pour la phase : 16 marqueurs de démarrage/validation répartis en 4 sous-phases
- Tâches de la phase complétées : 16/16
- Prochaine tâche : démarrer la phase 2.0 — baseline, frontières et assainissement de la template
- Blocages connus : aucun pour la phase 1 ; Node.js 24.18.0 a été validé depuis un binaire officiel isolé sous `/tmp`
- Validation visuelle : non applicable, le périmètre actuel est un CLI sans UI
- Phase suivante planifiée : Phase 2 — Intégration sécurisée de la nouvelle template Next.js 16
- Statut de la phase 2 : planifiée, aucune implémentation démarrée
- Sous-phases prévues pour la phase 2 : 8, de la baseline au paquet/CI, dont une mise à niveau stable des dépendances du CLI
- Dépendance de la phase 2 : achever le socle de validation de la phase 1
- Validation visuelle de la phase 2 : obligatoire sur captures desktop et mobile générées depuis une fixture propre

## État technique observé

Le dépôt contient des points d'entrée Bun et Node.js, un cœur TypeScript, des commandes de génération et une configuration de build désormais validés par la phase 1. L'exemple historique `my-next-app` est en cours de suppression dans les changements utilisateur et n'est plus utilisé comme fixture.

La phase 1 a établi un contexte CLI injectable, un registre asynchrone commun, des codes de sortie déterministes, une configuration TypeScript/ESLint/Prettier et 22 tests de caractérisation isolés. Les bundles Node.js 24 et Bun 1.3, le lanceur multi-runtime et le tarball npm ont été validés localement.

## Nouvelle template observée

`templates/Projects/default` contient une refonte locale non commitée vers Next.js 16, React 19, Bun-first, Auth.js v5, `next-intl`, Tailwind CSS 4, CSP et une suite de tests unitaires, consumer, rendu et Playwright. Elle contient aussi des éléments de travail qui ne doivent jamais être copiés ou publiés, notamment un dépôt `.git` imbriqué, `.agent`, `.cursor`, `.env`, `node_modules`, `.next` et des artefacts. Les modifications de la template, le dossier `templates/Projects/default-old` et les suppressions de `my-next-app` sont préservés comme changements utilisateur.
