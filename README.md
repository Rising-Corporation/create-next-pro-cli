<img src="./public/cnp-banner.svg" alt="create-next-pro" width="100%" />

# create-next-pro-cli

`create-next-pro` génère et fait évoluer des projets Next.js 16 avec TypeScript, App Router, React 19, Tailwind CSS 4, `next-intl` et Auth.js.

Le lanceur utilise Bun lorsqu'il est disponible et revient automatiquement à Node.js. Aucun runtime n'est mémorisé. Les projets générés sont validés avec Bun, npm et pnpm.

## Prérequis

- Node.js 24 ou supérieur, ou Bun 1.3 ou supérieur pour exécuter le CLI.
- Bun 1.3+, npm fourni avec Node.js 24+, ou pnpm 11+ pour le projet généré.

## Installation

```bash
bun install --global create-next-pro-cli
# ou
npm install --global create-next-pro-cli
# ou
pnpm add --global create-next-pro-cli
```

Sans installation globale :

```bash
bunx create-next-pro-cli my-app
npx create-next-pro-cli my-app
pnpm dlx create-next-pro-cli my-app
```

Au premier lancement, l'assistant propose l'installation de l'autocomplétion Bash ou Zsh. `create-next-pro --reconfigure` permet de relancer cet assistant sans dupliquer la configuration du shell.

## Créer un projet

```bash
create-next-pro my-app
cd my-app
```

Installez ensuite les dépendances avec le gestionnaire de votre choix :

```bash
bun install && bun run dev
# ou
npm install && npm run dev
# ou
pnpm install && pnpm run dev
```

Une destination existante est refusée par défaut. `--force` autorise uniquement le remplacement de la destination enfant demandée :

```bash
create-next-pro my-app --force
```

Sans nom de projet, le CLI ouvre l'assistant interactif. L'alias d'import doit respecter la forme `<préfixe>/*`, par exemple `@/*` ou `@core/*`. Il est écrit dans `tsconfig.json` et `cnp.config.json`, puis réutilisé par les générateurs.

## Commandes d'évolution

Les commandes suivantes s'exécutent depuis la racine d'un projet généré.

```bash
# Pages simples ou imbriquées
create-next-pro addpage profile
create-next-pro addpage account.security

# Composants globaux ou rattachés à une page
create-next-pro addcomponent Alert
create-next-pro addcomponent PasswordForm --page account.security

# Bibliothèques et modules
create-next-pro addlib analytics
create-next-pro addlib analytics.trackEvent

# Routes API
create-next-pro addapi health

# Langues et traductions
create-next-pro addlanguage de
create-next-pro addtext dashboard.welcome "Bienvenue"

# Suppression directe
create-next-pro rmpage account.security

# Menu arborescent autocomplétable avec confirmation
create-next-pro rmpage
```

`addpage` crée par défaut `layout`, `page` et `loading`. Les options longues disponibles sont `--layout`, `--page`, `--loading`, `--not-found`, `--error`, `--global-error`, `--route`, `--template` et `--default`. Les formes courtes historiques restent disponibles.

`rmpage` ne propose que les routes contenant réellement un `page.tsx`. Les groupes Next.js et répertoires techniques sont masqués. La suppression est confinée au projet et préserve les parents partagés et fichiers étrangers.

## Options générales

```text
--help          Afficher l'aide
--version, -v   Afficher la version
--reconfigure   Relancer la configuration du CLI
--force         Remplacer une destination de projet existante
```

## Environnement et sécurité

Le projet généré contient `.env.example`, jamais le `.env` local de la template. Copiez-le avant de configurer Auth.js :

```bash
cp .env.example .env.local
```

Les identifiants OAuth, dépôts Git imbriqués, caches, dépendances installées, artefacts Playwright et contextes d'agent sont exclus de la génération et du paquet npm. Pour un déploiement sans authentification, utilisez `AUTH_DISABLED=true`.

## Qualité

Dans le dépôt du CLI :

```bash
bun install --frozen-lockfile
bun run check
```

Dans un projet généré, les mêmes scripts fonctionnent avec les trois gestionnaires :

```bash
bun run check
npm run check
pnpm run check
```

Les validations couvrent format, lint, TypeScript, Vitest, build Next.js et contrat de rendu. `npm pack --dry-run --json` permet d'inspecter le contenu distribuable du CLI.

## Développement

```bash
git clone https://github.com/Rising-Corporation/create-next-pro-cli.git
cd create-next-pro-cli
bun install --frozen-lockfile
bun run build
bun link
create-next-pro --help
```

Licence MIT. Les contributions sont décrites dans [CONTRIBUTING.md](./CONTRIBUTING.md).
