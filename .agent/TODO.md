# Suivi du projet

## Initialisation du contexte — 2026-07-17

- [x] started — Recueillir le but, les documentations et les technologies prioritaires
- [x] finished — But confirmé : scaffolder Next.js en TypeScript pour Bun et Node.js
- [x] started — Examiner le dépôt et définir l'architecture de travail
- [x] finished — État existant inventorié et feuille de route initiale définie
- [x] started — Créer la structure `.agent` requise
- [x] finished — Contexte, configuration, statut et sentinelle créés

## Phase 1 — Audit et socle fiable du CLI

### Phase 1.0 — Inventaire et critères de référence

- [x] started — Cartographier les points d'entrée Bun/Node.js, les commandes, les templates et les artefacts distribués
- [x] finished — Valider l'inventaire et consigner les écarts entre documentation, code source et package publié
- [x] started — Définir la matrice de compatibilité Bun/Node.js et les scénarios critiques
- [x] finished — Valider les critères d'acceptation de la phase

### Phase 1.1 — Configuration et architecture du CLI

- [x] started — Séparer le cœur métier, les adaptateurs runtime, les interactions terminal et les accès au système de fichiers
- [x] finished — Vérifier le typage strict et les frontières de modules avec TypeScript
- [x] started — Harmoniser les scripts de lint, format, test et build pour Bun et Node.js
- [x] finished — Exécuter avec succès les contrôles de configuration et les builds des deux runtimes

### Phase 1.2 — Tests du scaffolding existant

- [x] started — Ajouter des tests unitaires pour la validation, le nommage et la résolution de chemins
- [x] finished — Exécuter les tests unitaires sans erreur
- [x] started — Ajouter des tests d'intégration dans des répertoires temporaires pour la création et les sous-commandes critiques
- [x] finished — Vérifier que les fixtures générées sont valides et que les fichiers existants sont préservés

### Phase 1.3 — Validation finale

- [x] started — Exécuter formatage, lint, tests et builds Bun/Node.js
- [x] finished — Confirmer que tous les contrôles passent ou documenter précisément tout blocage préexistant
- [x] started — Mettre à jour le statut et résumer la phase
- [x] finished — Clore la phase 1 après validation de tous les livrables

No visual test: le périmètre est un CLI et ne modifie aucune interface graphique.

## Phase 2 — Intégration sécurisée de la nouvelle template Next.js 16

Dépendance : achever les critères de référence et le socle de validation de la phase 1 avant l'intégration. Statut initial : planifiée, aucune tâche livrée.

### Phase 2.0 — Baseline, frontières et assainissement de la template

- [ ] started — Inventorier les fichiers fonctionnels de `templates/Projects/default` en excluant `.git`, `.agent`, `.cursor`, `.env`, `node_modules`, `.next`, `artifacts`, `test-results`, caches et sorties locales
- [ ] finished — Valider une liste explicite des fichiers sources, fixtures et workflows autorisés à être copiés et publiés
- [ ] started — Définir le contrat Bun-first de la template et la frontière distincte du runtime Bun/Node.js du CLI
- [ ] finished — Vérifier que README, `package.json`, lockfile, engines et messages du CLI décrivent le même contrat
- [ ] started — Identifier les changements intentionnels de routes, messages et composants entre l'ancienne et la nouvelle template sans modifier `templates/Projects/default-old`
- [ ] finished — Valider une matrice de migration des noms (`Dashboard`/`dashboard`, `Login`/`login`, `UserInfo`/`userInfo`) et des fichiers supprimés ou remplacés
- Tests : contrôle automatisé de l'allowlist/denylist, absence de secrets et inventaire reproductible depuis un clone propre
- Estimation : 2 à 4 heures

### Phase 2.1 — Contrat de copie et contenu du paquet npm

- [ ] started — Remplacer la copie récursive implicite par un contrat de copie déterministe ou une source de template assainie
- [ ] finished — Prouver qu'un projet généré n'embarque aucun dépôt imbriqué, secret, contexte agent, dépendance installée, cache ou artefact
- [ ] started — Garantir la présence de `.gitignore`, `.env.example`, `next-env.d.ts`, `bun.lock`, tests utiles et assets dans le projet généré et le tarball npm
- [ ] finished — Comparer le contenu local, le résultat généré et le résultat de `npm pack --dry-run` fichier par fichier
- [ ] started — Injecter le nom de projet demandé dans le `package.json` généré sans altérer les versions verrouillées de la template
- [ ] finished — Tester les noms valides et les conflits de destination dans un répertoire temporaire
- Tests : tests unitaires du manifeste, test de génération temporaire, inspection de `npm pack --dry-run`
- Estimation : 3 à 5 heures

### Phase 2.2 — Sécurité des entrées et opérations de fichiers

- [ ] started — Centraliser la validation des noms, la normalisation et le confinement des chemins pour toutes les commandes publiques
- [ ] finished — Rejeter chemins absolus, `..`, séparateurs interdits, segments vides, caractères de contrôle et destinations hors racine
- [ ] started — Remplacer les suppressions shell de `rmpage` par les APIs `node:fs/promises` et définir une politique explicite de confirmation/conflit
- [ ] finished — Vérifier qu'aucune commande ne peut écrire ou supprimer hors du projet, y compris avec `--force` et des entrées malveillantes
- [ ] started — Faire remonter les erreurs structurées et attendre toutes les opérations asynchrones depuis le point d'entrée CLI
- [ ] finished — Vérifier les codes de sortie et l'absence de promesses rejetées non gérées sous Bun et Node.js
- Tests : table de cas malveillants, chemins Unicode, injection shell, destination parente, symlinks et échecs partiels
- Estimation : 4 à 6 heures

### Phase 2.3 — Compatibilité des générateurs avec la nouvelle architecture

- [ ] started — Adapter `addpage` et `addcomponent` aux routes localisées, groupes `(public)`/`(user)`, conventions de casse et fichiers de messages de la nouvelle template
- [ ] finished — Générer pages simples et imbriquées sans écraser les composants, traductions ou layouts existants
- [ ] started — Adapter `addlanguage`, `addtext`, `addapi`, `addlib` et `rmpage` aux nouveaux helpers i18n, Auth.js v5 et chemins de la template
- [ ] finished — Exécuter un cycle ajout/suppression sur une fixture générée et confirmer que format, typecheck et build restent valides
- [ ] started — Décider explicitement du sort des options TypeScript, ESLint, Tailwind, `src`, Turbopack, i18n et alias pour une template Bun-first
- [ ] finished — Tester chaque option supportée et refuser proprement chaque combinaison non supportée
- Tests : intégration par commande sur copies temporaires, snapshots de structure et build après mutations
- Estimation : 6 à 10 heures

### Phase 2.4 — Mise à niveau stable des dépendances du CLI

- [ ] started — Établir l'inventaire des dépendances directes, de développement et transitives du `package.json` et de `bun.lock`, puis relever les dernières versions stables disponibles à la date d'exécution
- [ ] finished — Produire une matrice version actuelle/cible, changements majeurs, prérequis Bun/Node.js et migrations nécessaires pour chaque package
- [ ] started — Mettre à niveau `prompts` et l'outillage du CLI (`commitlint`, types Node/prompts, Commitizen, Husky, lint-staged, Prettier, tsup, Vitest et dépendances associées) sans sélectionner de version alpha, beta, RC ou canary
- [ ] finished — Adapter configuration, imports, scripts et hooks aux changements incompatibles, puis régénérer `bun.lock` de façon déterministe
- [ ] started — Identifier et retirer les dépendances devenues inutiles ou redondantes, notamment celles qui ne sont référencées ni par le code, ni par le build, ni par les hooks
- [ ] finished — Vérifier qu'aucune dépendance runtime nécessaire n'est classée uniquement en `devDependencies` et que le paquet installé n'embarque pas d'outillage inutile
- [ ] started — Exécuter l'audit de sécurité après mise à niveau et documenter toute vulnérabilité sans correctif stable plutôt que d'accepter une préversion automatiquement
- [ ] finished — Valider installation gelée, format, lint, typecheck, tests et builds du CLI sous les versions minimales supportées de Bun et Node.js
- Tests : `bun outdated`, installation avec lockfile gelé, `bun audit`, contrôles qualité, tests et builds Bun/Node.js, test du binaire empaqueté
- Estimation : 3 à 6 heures

### Phase 2.5 — Qualité, sécurité applicative et validation consumer

- [ ] started — Exécuter dans la template `format:check`, lint, typecheck, tests Bun, audit, build et vérification du rendu statique/dynamique
- [ ] finished — Confirmer que les routes publiques sont pré-rendues, que les routes privées/Auth restent dynamiques et que les en-têtes de sécurité sont présents
- [ ] started — Étendre `test:consumer` pour valider une copie issue du vrai moteur du CLI plutôt qu'une copie manuelle incomplète
- [ ] finished — Exécuter le consumer test depuis un répertoire temporaire propre avec lockfile gelé
- [ ] started — Ajouter une matrice de fumée du binaire distribué sous Bun et Node.js, tout en conservant Bun comme gestionnaire de la template générée
- [ ] finished — Valider aide, version, onboarding non destructif, création et codes de sortie sur les deux runtimes
- Tests : `bun run check`, `bun run audit`, `bun run test:consumer`, tests du binaire Node.js/Bun
- Estimation : 4 à 6 heures

### Phase 2.6 — Validation visuelle desktop et mobile

- [ ] started — Générer une fixture propre puis exécuter Playwright sur les routes publiques anglaises et françaises, la navigation mobile, le thème et la redirection des routes privées
- [ ] finished — Produire `artifacts/captures/phase-2-template-integration-desktop.png` et `artifacts/captures/phase-2-template-integration-mobile.png`
- [ ] started — Ouvrir les deux captures avec `view_image` et contrôler frame non vide, header, contenu principal, sélecteur de langue, thème, lisibilité et absence de chevauchement
- [ ] finished — Consigner le résultat visuel et corriger toute régression avant validation de la phase
- Tests : `bun run test:e2e` sur Chromium desktop et Pixel 5, assertions d'accessibilité et inspection visuelle obligatoire
- Estimation : 2 à 4 heures

### Phase 2.7 — Paquet, CI et clôture

- [ ] started — Faire exécuter par la CI racine les contrôles du CLI, la génération consumer, les contrôles de la template et Playwright sans publier depuis une branche non taguée
- [ ] finished — Vérifier que le workflow échoue si un fichier interdit est inclus, si le projet généré diverge ou si une capture/test régresse
- [ ] started — Vérifier le tarball final, ses permissions, les bundles Bun/Node.js, le lanceur, les templates et les métadonnées `engines`/`packageManager`
- [ ] finished — Confirmer qu'un tag Git public correspond exactement à la version npm candidate, sans publier pendant la phase de validation
- [ ] started — Mettre à jour le statut, les métriques et le résumé de phase avec les commandes et artefacts réellement validés
- [ ] finished — Clore la phase uniquement après passage de tous les contrôles et inspection des captures
- Tests finaux : vérification des versions stables et du lockfile, format, lint, typecheck, tests unitaires/intégration, builds Bun/Node.js, `npm pack --dry-run`, consumer, audit, rendu et Playwright
- Estimation : 3 à 5 heures

Risques et hypothèses : la nouvelle template est considérée comme la cible fonctionnelle, mais ses répertoires générés et son dépôt Git interne ne font pas partie du produit. « Dernière version stable » exclut toute préversion et doit être résolue depuis le registre au moment de l'exécution ; une mise à niveau majeure peut imposer une migration ou le remplacement d'un outil obsolète. Les suppressions actuelles de `my-next-app` et le dossier `templates/Projects/default-old` appartiennent à l'utilisateur et restent hors de cette phase. Bun et Node.js doivent être accessibles dans le `PATH` avant toute validation d'implémentation.
