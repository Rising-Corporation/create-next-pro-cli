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

- [ ] started — Cartographier les points d'entrée Bun/Node.js, les commandes, les templates et les artefacts distribués
- [ ] finished — Valider l'inventaire et consigner les écarts entre documentation, code source et package publié
- [ ] started — Définir la matrice de compatibilité Bun/Node.js et les scénarios critiques
- [ ] finished — Valider les critères d'acceptation de la phase

### Phase 1.1 — Configuration et architecture du CLI

- [ ] started — Séparer le cœur métier, les adaptateurs runtime, les interactions terminal et les accès au système de fichiers
- [ ] finished — Vérifier le typage strict et les frontières de modules avec TypeScript
- [ ] started — Harmoniser les scripts de lint, format, test et build pour Bun et Node.js
- [ ] finished — Exécuter avec succès les contrôles de configuration et les builds des deux runtimes

### Phase 1.2 — Tests du scaffolding existant

- [ ] started — Ajouter des tests unitaires pour la validation, le nommage et la résolution de chemins
- [ ] finished — Exécuter les tests unitaires sans erreur
- [ ] started — Ajouter des tests d'intégration dans des répertoires temporaires pour la création et les sous-commandes critiques
- [ ] finished — Vérifier que les fixtures générées sont valides et que les fichiers existants sont préservés

### Phase 1.3 — Validation finale

- [ ] started — Exécuter formatage, lint, tests et builds Bun/Node.js
- [ ] finished — Confirmer que tous les contrôles passent ou documenter précisément tout blocage préexistant
- [ ] started — Mettre à jour le statut et résumer la phase
- [ ] finished — Clore la phase 1 après validation de tous les livrables

No visual test: le périmètre est un CLI et ne modifie aucune interface graphique.
