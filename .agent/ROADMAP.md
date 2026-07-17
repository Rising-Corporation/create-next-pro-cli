# Feuille de route — create-next-pro-cli

`create-next-pro-cli` est un scaffolder en ligne de commande destiné à générer et faire évoluer des projets Next.js professionnels. Le CLI est écrit en TypeScript, doit fonctionner sous Bun et Node.js, et s'appuie en priorité sur les documentations officielles des technologies utilisées.

## Phase 1 — Audit et socle fiable du CLI

Cette phase établit une base reproductible à partir de l'implémentation existante. Elle couvre l'inventaire des commandes, des templates et des deux runtimes, la remise en cohérence de la configuration TypeScript et du build, puis l'installation de validations automatisées. Le périmètre public inclut la commande `create-next-pro`, ses sous-commandes et les projets générés. Aucun changement fonctionnel majeur n'est attendu avant que le comportement actuel soit couvert par des tests.

Les livrables attendus sont un build Bun/Node.js reproductible, une suite de tests ciblant les chemins critiques du scaffolding, une configuration de qualité exécutable depuis les scripts du projet et un état documenté des fonctionnalités réellement disponibles.

## Phase 2 — Intégration sécurisée de la nouvelle template Next.js 16

Cette phase intègre la refonte présente dans `templates/Projects/default` comme nouvelle référence de génération. Elle prend en charge son socle Bun-first, Next.js 16, React 19, Auth.js v5, `next-intl`, Tailwind CSS 4, CSP, validation d'environnement et tests Playwright, tout en préservant la capacité du CLI lui-même à s'exécuter sous Bun ou Node.js. La template est un consommateur du scaffolder : elle ne doit ni embarquer son dépôt Git interne, ni ses caches, dépendances installées, secrets, contexte agent ou artefacts de test.

Le périmètre inclut le contrat de fichiers publiables, le moteur de copie, la sécurité des chemins et suppressions, la compatibilité des commandes `addpage`, `addcomponent`, `addlib`, `addapi`, `addlanguage`, `addtext` et `rmpage` avec les nouvelles conventions de casse et de routage, la mise à niveau de toutes les dépendances directes et de développement du CLI vers leurs dernières versions stables compatibles, ainsi que la validation complète d'un projet généré. Les choix interactifs qui ne peuvent pas être honorés par cette template Bun-first devront être soit implémentés réellement, soit explicitement refusés sans produire une configuration trompeuse.

Les livrables attendus sont une template assainie et reproductible, un manifeste ou une politique d'inclusion explicite, des opérations confinées à la racine du projet, un manifeste et un lockfile du CLI actualisés sans préversion implicite, un paquet npm vérifié, des tests unitaires et consumer, ainsi que des captures Playwright desktop et mobile inspectées. `templates/Projects/default-old`, le dépôt interne de travail de la nouvelle template et la suppression en cours de `my-next-app` restent hors périmètre et ne doivent pas être modifiés implicitement.

## Phase 3 — Génération de projet Next.js modulaire

Cette phase isolera le modèle de configuration, la validation des entrées, le moteur de templates et les adaptateurs de système de fichiers. La création interactive et non interactive devra produire le même résultat pour une configuration identique. Le support prioritaire couvrira TypeScript, App Router, ESLint, Tailwind CSS, le répertoire `src`, les alias d'import et le choix Bun ou Node.js pour le projet consommateur.

Les templates resteront des consommateurs des APIs publiques de Next.js. Les versions et conventions générées devront être alignées sur la documentation officielle et vérifiées par un test de génération dans un répertoire temporaire.

## Phase 4 — Commandes d'évolution du projet

Cette phase stabilisera les commandes d'ajout et de suppression de pages, composants, bibliothèques, routes API, langues et textes. Chaque commande devra partager les mêmes règles de résolution de chemins, de nommage et de sécurité, préserver les fichiers utilisateur et fournir des erreurs actionnables.

Les livrables incluront des tests d'intégration sur une fixture générée et une politique explicite pour les écritures, les conflits et les opérations destructrices.

## Phase 5 — Expérience développeur et publication

Cette phase finalisera l'aide en ligne, l'autocomplétion, la compatibilité des paquets npm avec Bun et Node.js, ainsi que le processus de publication. Elle vérifiera l'installation globale, l'exécution du binaire distribué et un parcours complet de création de projet.

La phase se terminera par des contrôles de package, de licence, de documentation utilisateur existante et de compatibilité sur les runtimes supportés.
