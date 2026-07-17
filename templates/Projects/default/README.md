# Create Next Pro Template

Next.js App Router template for `create-next-pro-cli`.

## Runtime

This template is Bun-first. Do not use npm, pnpm, or yarn for project scripts.

Required:

```bash
bun --version
node --version
```

Node must satisfy `>=24.0.0`.

## Setup

```bash
bun install
cp .env.example .env
bun run dev
```

Open `http://localhost:3000`.

## Environment

Auth.js v5 supports Google OAuth when credentials are configured. The public
application, checks and production build work without OAuth credentials.

Optional Google OAuth values (set all three together):

```bash
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_TRUST_HOST=false
AUTH_DISABLED=false
```

The template also accepts the legacy aliases `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `PROJECT_PRODUCTION_URL` to ease migration from older generated projects.

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
and Auth.js handlers stay dynamic. `bun run verify:rendering` checks this boundary
after every production build.

The default Content Security Policy follows the stable static-rendering setup
documented by Next.js and allows the framework's inline bootstrap scripts. Projects
with stricter compliance requirements can adopt a per-request nonce, with the
tradeoff that nonce-protected pages become dynamically rendered.
