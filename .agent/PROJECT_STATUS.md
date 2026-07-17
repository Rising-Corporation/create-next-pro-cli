# État du projet

- Projet : `create-next-pro-cli`
- Date d'initialisation du contexte : 2026-07-17
- Phase courante : Phase 1 — Audit et socle fiable du CLI
- Statut : planifiée, non démarrée
- Progression : structure `.agent` initialisée ; implémentation existante à auditer
- Tâches prévues pour la phase : 16 marqueurs de démarrage/validation répartis en 4 sous-phases
- Tâches de la phase complétées : 0
- Prochaine tâche : cartographier les points d'entrée, commandes, templates et artefacts distribués
- Blocages connus : Bun et Node.js sont absents du `PATH` de la session ; les contrôles runtime et Prettier restent à exécuter
- Validation visuelle : non applicable, le périmètre actuel est un CLI sans UI
- Phase suivante planifiée : Phase 2 — Intégration sécurisée de la nouvelle template Next.js 16
- Statut de la phase 2 : planifiée, aucune implémentation démarrée
- Sous-phases prévues pour la phase 2 : 8, de la baseline au paquet/CI, dont une mise à niveau stable des dépendances du CLI
- Dépendance de la phase 2 : achever le socle de validation de la phase 1
- Validation visuelle de la phase 2 : obligatoire sur captures desktop et mobile générées depuis une fixture propre

## État technique observé

Le dépôt contient déjà des points d'entrée Bun et Node.js, un cœur TypeScript, des commandes de génération, des artefacts `dist`, un exemple de projet généré et une configuration de build. La présence et la cohérence des modules importés, des templates, des tests et des scripts de qualité restent à vérifier pendant la phase 1.

## Nouvelle template observée

`templates/Projects/default` contient une refonte locale non commitée vers Next.js 16, React 19, Bun-first, Auth.js v5, `next-intl`, Tailwind CSS 4, CSP et une suite de tests unitaires, consumer, rendu et Playwright. Elle contient aussi des éléments de travail qui ne doivent jamais être copiés ou publiés, notamment un dépôt `.git` imbriqué, `.agent`, `.cursor`, `.env`, `node_modules`, `.next` et des artefacts. Les modifications de la template, le dossier `templates/Projects/default-old` et les suppressions de `my-next-app` sont préservés comme changements utilisateur.
