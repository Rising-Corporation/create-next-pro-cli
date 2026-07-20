# Create Next Pro Template

Next.js App Router template for `create-next-pro-cli`.

## Runtime

Choose one runtime and package-manager path for dependency installation and
project scripts. The repository keeps `bun.lock` as its reproducible source
lockfile, while npm and pnpm consumers create their own lockfiles in their
working copies.

Bun-only path:

```bash
bun --version
```

Node.js path:

```bash
node --version
npm --version # or: pnpm --version
```

Bun must satisfy `>=1.3.14` when selected and does not require a separate
Node.js installation. The Node.js path requires Node.js `>=24.0.0`; pnpm 11 or
later is supported.

The npm `allowScripts` policy and pnpm `allowBuilds` policy approve only the
native build steps required by Next.js and the file-watcher toolchain. Security
overrides are declared for both npm-compatible and pnpm dependency graphs.

## Setup

```bash
bun install
cp .env.example .env
bun run dev

# or
npm install
cp .env.example .env
npm run dev

# or
pnpm install
cp .env.example .env
pnpm run dev
```

Open `http://localhost:3000`.

## Environment

Auth.js v5 supports Google OAuth. The canonical `.env.example` intentionally
contains public, limited development credentials so a generated project can be
tested immediately. Treat every value in that file as public and replace all
authentication credentials before production use.

Auth.js requires the application secret, Google client ID, and Google client
secret to be set together:

```bash
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_TRUST_HOST=false
AUTH_DISABLED=false
```

The template also accepts the legacy aliases `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `PROJECT_PRODUCTION_URL` to ease
migration from older generated projects. Set `AUTH_DISABLED=true` when a check
must run without initializing the Google provider.

## Scripts

```bash
bun run dev
bun run lint
bun run typecheck
bun run build
bun run verify:rendering
bun test
bun run test:e2e
bun run test:consumer
bun run audit
bun run check
```

Replace `bun run` with `npm run` or `pnpm run` for the selected manager. The
`audit` and `test:consumer` scripts detect the invoking manager without shell
commands, including on Windows.

## Agent workflows

Codex-compatible project guidance is available in `AGENTS.md`. Focused command
skills under `.agents/skills` document project creation and every public
`add*`/`rmpage` operation. Agents should read the matching skill, invoke the CLI
with `--json`, inspect all reported events and complete every required next
step before running the project checks.

## Template Features

- Next.js 16 App Router
- React 19
- Auth.js v5 through `next-auth@beta`
- Google OAuth provider
- Protected user routes
- `next-intl` locale routing for `en` and `fr`
- Tailwind CSS 4 theme tokens
- Playwright smoke captures for desktop and mobile

## Rendering and CSP

Public localized pages are prerendered for `en` and `fr`. Authenticated routes
and Auth.js handlers stay dynamic. `verify:rendering` checks this boundary after
every production build, regardless of the selected package manager.

The default Content Security Policy follows the stable static-rendering setup
documented by Next.js and allows the framework's inline bootstrap scripts. Projects
with stricter compliance requirements can adopt a per-request nonce, with the
tradeoff that nonce-protected pages become dynamically rendered.
