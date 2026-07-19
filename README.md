<img src="./public/cnp-banner.svg" alt="create-next-pro" width="100%" />

# create-next-pro-cli

[![Bun](https://img.shields.io/badge/Bun-1.3%2B-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/create-next-pro-cli?logo=npm&color=CB3837)](https://www.npmjs.com/package/create-next-pro-cli)
[![npm downloads](https://img.shields.io/npm/dw/create-next-pro-cli?logo=npm)](https://www.npmjs.com/package/create-next-pro-cli)
[![CI](https://github.com/Rising-Corporation/create-next-pro-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Rising-Corporation/create-next-pro-cli/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/Rising-Corporation/create-next-pro-cli?style=social)](https://github.com/Rising-Corporation/create-next-pro-cli)
[![GitHub issues](https://img.shields.io/github/issues/Rising-Corporation/create-next-pro-cli?logo=github)](https://github.com/Rising-Corporation/create-next-pro-cli/issues)
[![License](https://img.shields.io/github/license/Rising-Corporation/create-next-pro-cli?logo=open-source-initiative&logoColor=white)](./LICENSE)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org/en/v1.0.0/)

`create-next-pro` generates and evolves Next.js 16 projects with TypeScript, App Router, React 19, Tailwind CSS 4, `next-intl`, and Auth.js.

The launcher uses Bun when available and automatically falls back to Node.js. No runtime selection is persisted. Generated projects are validated with Bun, npm, and pnpm.

## Purpose

`create-next-pro` provides a reproducible, production-oriented Next.js foundation and commands to evolve it without manually relocating files. The scaffolder separates App Router routes, interfaces under `src/ui`, translated messages, and application libraries to keep the structure clear as the application grows.

The CLI is built around a runtime-independent core, injectable terminal and file-system adapters, and generators confined to the project root. The distributed template includes internationalization, authentication, a CSP policy, environment validation, and automated quality checks.

## Main features

- direct or interactive Next.js 16 project creation;
- Bun-first CLI execution with an automatic Node.js fallback;
- generated projects compatible with Bun, npm, and pnpm;
- generation of pages, components, libraries, and API routes;
- addition of `next-intl` locales and messages;
- direct or interactive page removal with a tree-based selector;
- nested routes and interfaces using `Parent.Child` notation;
- customizable import aliases such as `@/*` or `@core/*`;
- dedicated Bash and Zsh completion;
- confined file operations and allowlist-based template copying;
- Auth.js, CSP, environment validation, Vitest, and Playwright in the template.

## Requirements

- Node.js 24 or later, or Bun 1.3 or later, to run the CLI.
- Bun 1.3+, the npm version bundled with Node.js 24+, or pnpm 11+ for generated projects.

## Installation

```bash
bun install --global create-next-pro-cli
# or
npm install --global create-next-pro-cli
# or
pnpm add --global create-next-pro-cli
```

Without a global installation:

```bash
bunx create-next-pro-cli my-app
npx create-next-pro-cli my-app
pnpm dlx create-next-pro-cli my-app
```

On first launch, the onboarding assistant offers to install Bash or Zsh completion. Run `create-next-pro --reconfigure` to start the assistant again without duplicating the shell configuration.

## Create a project

```bash
create-next-pro my-app
cd my-app
```

Then install dependencies with your preferred package manager:

```bash
bun install && bun run dev
# or
npm install && npm run dev
# or
pnpm install && pnpm run dev
```

An existing destination is rejected by default. `--force` only permits replacement of the requested child destination:

```bash
create-next-pro my-app --force
```

Without a project name, the CLI opens the interactive assistant. The import alias must follow the `<prefix>/*` form, such as `@/*` or `@core/*`. It is written to `tsconfig.json` and `cnp.config.json`, then reused by the generators.

## Project evolution commands

Run the following commands from the root of a generated project.

```bash
# Simple or nested pages
create-next-pro addpage profile
create-next-pro addpage account.security

# Global components or components attached to a page
create-next-pro addcomponent Alert
create-next-pro addcomponent PasswordForm --page account.security

# Libraries and modules
create-next-pro addlib analytics
create-next-pro addlib analytics.trackEvent

# Routes API
create-next-pro addapi health

# Locales and translations
create-next-pro addlanguage de
create-next-pro addtext dashboard.welcome "Welcome"

# Direct removal
create-next-pro rmpage account.security

# Tree-based autocomplete menu with confirmation
create-next-pro rmpage
```

`addlanguage` copies every message file from the configured default locale. The command reports each copied path and emits a required `translate` next step: the copied source-language text must be translated before the locale is ready to ship.

`addpage` creates `layout`, `page`, and `loading` files by default. Available long options are `--layout`, `--page`, `--loading`, `--not-found`, `--error`, `--global-error`, `--route`, `--template`, and `--default`. The historical short forms remain available.

`rmpage` only lists routes that contain an actual `page.tsx`. Next.js route groups and technical directories are hidden. Removal is confined to the project and preserves shared parent directories and unrelated files.

## Generated project architecture

The Next.js route and its interface are separate: `src/app` owns routing while `src/ui` owns page components. Translations remain organized by locale and domain.

```text
my-app/
├── .env.example
├── .gitignore
├── .prettierignore
├── bun.lock
├── cnp.config.json
├── messages/
│   ├── en/
│   │   ├── _global_ui.json
│   │   ├── _home.json
│   │   ├── dashboard.json
│   │   ├── login.json
│   │   ├── register.json
│   │   ├── settings.json
│   │   └── userInfo.json
│   ├── en.ts
│   ├── fr/
│   │   └── ...
│   └── fr.ts
├── public/
│   ├── logo.png
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (public)/
│   │   │   │   ├── _home/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (user)/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── settings/
│   │   │   │   └── userInfo/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   └── styles/globals.css
│   ├── lib/
│   │   ├── i18n/
│   │   ├── security/csp.ts
│   │   └── utils.ts
│   ├── ui/
│   │   ├── _global/
│   │   ├── _home/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── register/
│   │   ├── settings/
│   │   └── userInfo/
│   ├── auth.ts
│   ├── config.ts
│   ├── env.ts
│   └── proxy.ts
├── tests/
│   ├── consumer/
│   ├── e2e/
│   ├── rendering/
│   └── unit/
├── scripts/
│   ├── audit.ts
│   └── package-manager.ts
├── next.config.ts
├── package.json
├── playwright.config.ts
├── pnpm-workspace.yaml
├── tsconfig.json
└── vitest.config.ts
```

Template working files (`.env`, the nested Git repository, caches, screenshots, and test results) are not copied into generated projects. The CLI creates `cnp.config.json` with the project name and selected alias.

## CLI architecture

```text
create-next-pro-cli/
├── bin.bun.ts
├── bin.node.ts
├── src/
│   ├── cli/
│   │   ├── completion.ts
│   │   ├── onboarding.ts
│   │   ├── output.ts
│   │   └── registry.ts
│   ├── core/
│   │   ├── contracts.ts
│   │   ├── operations.ts
│   │   ├── page-catalog.ts
│   │   ├── project-paths.ts
│   │   └── template-manifest.ts
│   ├── lib/
│   │   ├── addApi.ts
│   │   ├── addComponent.ts
│   │   ├── addLanguage.ts
│   │   ├── addLib.ts
│   │   ├── addPage.ts
│   │   ├── addText.ts
│   │   ├── createProject.ts
│   │   └── rmPage.ts
│   ├── release/
│   │   └── model.ts
│   ├── runtime/
│   │   └── node-context.ts
│   ├── index.ts
│   └── scaffold.ts
├── templates/
│   ├── Component/
│   ├── Page/
│   ├── Projects/default/
│   ├── Api/
│   └── Lib/
├── create-next-pro-completion.sh
├── create-next-pro-completion.zsh
├── package.json
└── tsup.config.ts
```

The CLI registry resolves commands to a shared asynchronous interface. The core defines contracts, the page catalog, and path boundaries; runtime adapters provide prompts, console access, and file-system operations. Bun and Node.js bundles are built separately and selected by the `dist/create-next-pro` launcher.

## Global options

```text
--help          Show help
--version, -v   Show the version
--json          Emit one deterministic JSON document
--reconfigure   Run CLI configuration again
--force         Replace an existing project destination
```

`--json` can appear before or after a command. It disables prompts, colors, banners, and incidental logs. Standard output contains exactly one JSON document followed by a newline, while standard error remains empty even when the command fails. Internal shell completion continues to use its separate line-based protocol.

## Human and agent output

Human output names every created, copied, updated, deleted, unchanged, or skipped resource with an absolute path. It ends with a summary and only the next steps that are still required. For example, adding a locale clearly reports that its messages were copied from the source locale:

```text
COPIED translation-messages: /workspace/my-app/messages/de/dashboard.json from /workspace/my-app/messages/en/dashboard.json (locale="de", sourceLocale="en")
UPDATED messages-registry: /workspace/my-app/src/lib/i18n/messages.ts
SUCCESS: Added locale "de" by copying 7 files from "en".
NEXT [translate]: Translate every copied message from en to de; the copied text is not ready for delivery.
  /workspace/my-app/messages/de/dashboard.json
```

Agentic usage adds `--json`:

```bash
create-next-pro addapi health --json
```

The versioned document has stable status, event, next-step, and error fields:

```json
{
  "schemaVersion": 1,
  "command": "addapi",
  "status": "success",
  "exitCode": 0,
  "summary": "Added API route \"health\".",
  "projectRoot": "/workspace/my-app",
  "events": [
    {
      "sequence": 1,
      "action": "created",
      "resource": "directory",
      "role": "api-directory",
      "scope": "project",
      "path": "src/app/api/health"
    },
    {
      "sequence": 2,
      "action": "created",
      "resource": "file",
      "role": "api-route",
      "scope": "project",
      "path": "src/app/api/health/route.ts"
    }
  ],
  "nextSteps": [
    {
      "kind": "review",
      "required": true,
      "message": "Replace the example response and review validation and authentication.",
      "paths": [
        {
          "scope": "project",
          "path": "src/app/api/health/route.ts"
        }
      ]
    }
  ],
  "error": null
}
```

Paths inside events and next steps are relative to their named scope. Applicable absolute roots are exposed as `projectRoot`, `configRoot`, and `homeRoot`. Events never contain file contents, environment values, credentials, or secrets.

Command statuses are `success`, `unchanged`, `cancelled`, and `failed`. Successful mutations, idempotent no-op results, and user cancellations exit with code `0`; only `failed` exits with code `1`. Stable error codes include `INVALID_ARGUMENT`, `CONFIG_NOT_FOUND`, `I18N_DISABLED`, `TARGET_EXISTS`, `TARGET_NOT_FOUND`, `TEMPLATE_MISSING`, `UNSAFE_PATH`, `INCONSISTENT_LOCALE`, `FILESYSTEM_ERROR`, `INTERACTIVE_INPUT_REQUIRED`, and `ONBOARDING_REQUIRED`.

Interactive input is never attempted in JSON mode. Pass every required argument explicitly. On a new machine, run the CLI once without `--json` to complete onboarding; `--reconfigure --json` is intentionally rejected.

## Environment and security

Generated projects contain only the canonical `.env.example`, never the template's local `.env` or other environment copies. Copy it before configuring Auth.js:

```bash
cp .env.example .env.local
```

The Google and Auth.js values shipped in `.env.example` are intentionally public, limited development credentials. Replace all of them before production use. Nested Git repositories, caches, installed dependencies, Playwright artifacts, agent context, the local `.env`, and every non-canonical `.env*` file are excluded from generated projects and the npm package. For checks without authentication, use `AUTH_DISABLED=true`.

## Quality

In the CLI repository:

```bash
bun install --frozen-lockfile
bun run check
```

In a generated project, the same scripts work with all three package managers:

```bash
bun run check
npm run check
pnpm run check
```

Validation covers formatting, linting, TypeScript, Vitest, the Next.js build, and the rendering contract. Use `npm pack --dry-run --json` to inspect the CLI's distributable contents.

The template source keeps one official `bun.lock`. npm and pnpm create their
manager-specific lockfiles only in consumer worktrees; `.prettierignore` keeps
those generated locks outside formatting checks. The generated GitHub Actions
workflow validates all three managers independently and runs its npm job without
Bun installed. Explicit npm `allowScripts` and pnpm `allowBuilds` policies limit
native install scripts to the four dependencies required by the toolchain.

## Development

```bash
git clone https://github.com/Rising-Corporation/create-next-pro-cli.git
cd create-next-pro-cli
bun install --frozen-lockfile
bun run build
bun link
create-next-pro --help
```

MIT licensed. Contribution guidelines are available in [CONTRIBUTING.md](./CONTRIBUTING.md).
