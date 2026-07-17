# Phase 1 Summary

## Objectifs

- Auditer le CLI racine et fixer son contrat Node.js 24/Bun 1.3.
- Séparer le point d'entrée, l'onboarding, le registre de commandes et les adaptateurs runtime.
- Installer un socle reproductible de formatage, lint, typage, tests et build.
- Caractériser la création et les commandes existantes sans modifier la nouvelle template.

## Réalisations

- `main()` retourne désormais un code de sortie et les deux binaires attendent sa résolution.
- Le contexte d'exécution injecte arguments, environnement, répertoires, terminal, prompts et fichiers d'onboarding.
- Toutes les sous-commandes passent par un registre `CommandHandler` asynchrone et reçoivent un répertoire de travail explicite.
- Le scaffolder accepte une template et un terminal injectés pour les tests isolés.
- Le projet déclare Node.js `>=24`, Bun `>=1.3`, TypeScript strict, ESLint flat-config et Prettier.
- La CI ne publie plus automatiquement sur chaque push et valide les bundles Node.js/Bun, le lanceur et le tarball.

## Défis rencontrés

- Node.js n'était pas présent dans le `PATH`; un binaire officiel Node.js 24.18.0 isolé sous `/tmp` a permis la validation sans installation système.
- Le premier passage Bun a révélé l'absence de `describe.sequential`; le test a été rendu compatible avec Bun et relancé avec succès.
- Le tarball inspecté inclut actuellement `templates/Projects/default-old`; son exclusion appartient au contrat de paquet de la phase 2.

## Métriques

- Durée : une session d'implémentation
- Tâches complétées : 16/16 marqueurs de phase
- Tests : 22 réussis, 0 échec, 39 assertions
- Builds : Node.js et Bun réussis
- Fumées : bundles Node.js/Bun et lanceur Bun/Node.js réussis
- Bugs corrigés : attente des commandes asynchrones, codes de sortie déterministes et résolution des templates depuis les sources

## Apprentissages

- Le CLI publié et le mode source n'utilisaient pas toujours la même résolution de templates.
- Les tests racine doivent être confinés à `src` pour ne pas exécuter les tests propres à la nouvelle template.
- La publication npm automatique et le contenu du tarball nécessitent une politique explicite avant la phase de release.

## Prochaines étapes

- Démarrer la phase 2.0 et assainir la frontière de `templates/Projects/default`.
- Exclure dépôts imbriqués, secrets, caches, artefacts et `default-old` du projet généré et du paquet.
- Traiter ensuite la sécurité des chemins et la suppression shell sans modifier les comportements caractérisés avant couverture dédiée.
