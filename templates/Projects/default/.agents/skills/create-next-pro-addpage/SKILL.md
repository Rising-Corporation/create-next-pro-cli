---
name: create-next-pro-addpage
description: Add a simple or Parent.Child page to a generated create-next-pro project. Use when Codex needs to create App Router files, page UI, and localized messages while preserving existing page resources.
---

# Add a page

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Use a safe logical page name with one segment or exactly `Parent.Child`.
- Choose the route area explicitly: `public` is anonymous, `user` requires authentication, and `admin` additionally requires the server-side email allowlist.
- Inspect the requested route and UI scope before generating files. A logical page name can belong to only one area.

## Command

```bash
create-next-pro addpage <Page|Parent.Child> --area <public|user|admin> [options] [--json]
```

`--area` accepts only the exact lowercase values `public`, `user`, and `admin`. It may appear before or after the page name, but it cannot be repeated or written as `--area=value`. With no page name, human mode asks for both the name and area; JSON mode requires both explicitly.

With no file options, the command selects `layout`, `page`, and `loading`.

| Long option      | Short option | Generated route file |
| ---------------- | ------------ | -------------------- |
| `--layout`       | `-L`         | `layout.tsx`         |
| `--page`         | `-P`         | `page.tsx`           |
| `--loading`      | `-l`         | `loading.tsx`        |
| `--not-found`    | `-n`         | `not-found.tsx`      |
| `--error`        | `-e`         | `error.tsx`          |
| `--global-error` | `-g`         | `global-error.tsx`   |
| `--route`        | `-r`         | `route.ts`           |
| `--template`     | `-t`         | `template.tsx`       |
| `--default`      | `-d`         | `default.tsx`        |

Short options can be combined, for example `-PLl`. Unknown options fail with `INVALID_ARGUMENT`.

## Effects

For `Account.Security --area user`, expect resources under:

- `src/app/[locale]/(user)/Account/Security/`
- `src/ui/Account/Security/page-ui.tsx`
- `messages/<locale>/Account.json` at the `Security` namespace
- `messages/<locale>.ts` when the message file needs registration

The route area affects only the App Router path and layout. UI and message paths remain area-independent. Public page UI uses its own `<main>` landmark; user and admin page UI use `<section>` because their protected layouts already provide `<main>`. Configure `AUTH_ADMIN_EMAILS` before testing an admin page; missing or invalid configuration denies access.

The generated page-level `layout.tsx` accepts only `children` because it does not read route parameters. If you customize it to read the locale under Next.js 16, make the component asynchronous, type `params` as `Promise<{ locale: string }>` and await it before use.

The command creates only missing code files and preserves existing ones as `unchanged`. Repeating the command in the same area is idempotent and can add requested missing route files. Requesting the same logical page in another official area fails with `TARGET_EXISTS`. Flat historical routes or ambiguous route definitions fail with `INCONSISTENT_ROUTE` before any write. Older projects without the `(admin)` layout return `CONFIG_NOT_FOUND` instead of being migrated automatically.

## Workflow

1. Select the logical page name, area, and only the required route file options.
2. Run the command with `--json`.
3. Inspect route, UI, translation, and aggregator events separately.
4. Review every generated UI and route file.
5. Replace or translate placeholder messages in every locale.
6. Run the project checks.

## Examples

Create the default page resources:

```bash
create-next-pro addpage Profile --area public
```

Create only `page.tsx`, `layout.tsx`, and the page UI for a nested page:

```bash
create-next-pro addpage Account.Security --area user -PL --json
```

Create an administrator page after configuring the server-side allowlist:

```bash
create-next-pro addpage Operations.Audit --area admin -PL --json
```

Create an error and not-found boundary:

```bash
create-next-pro addpage Checkout --area public --error --not-found --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

Confirm every `created` or `updated` event path exists. A repeated command should preserve existing code and normally report those resources as `unchanged`.

When a generated or customized layout reads route parameters, include `next build` in validation so Next.js checks the inferred `LayoutProps` contract.
