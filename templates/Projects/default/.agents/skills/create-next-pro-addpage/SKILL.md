---
name: create-next-pro-addpage
description: Add a simple or Parent.Child page to a generated create-next-pro project. Use when Codex needs to create App Router files, page UI, and localized messages while preserving existing page resources.
---

# Add a page

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Use a safe logical page name with one segment or exactly `Parent.Child`.
- Inspect the requested route and UI scope before generating files.

## Command

```bash
create-next-pro addpage <Page|Parent.Child> [options] [--json]
```

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

For `Account.Security`, expect resources under:

- `src/app/[locale]/Account/Security/`
- `src/ui/Account/Security/page-ui.tsx`
- `messages/<locale>/Account.json` at the `Security` namespace
- `messages/<locale>.ts` when the message file needs registration

The command creates only missing code files and preserves existing ones as `unchanged`. It prepares all required templates and locale updates before writing.

## Workflow

1. Select the logical page name and only the required route file options.
2. Run the command with `--json`.
3. Inspect route, UI, translation, and aggregator events separately.
4. Review every generated UI and route file.
5. Replace or translate placeholder messages in every locale.
6. Run the project checks.

## Examples

Create the default page resources:

```bash
create-next-pro addpage Profile
```

Create only `page.tsx`, `layout.tsx`, and the page UI for a nested page:

```bash
create-next-pro addpage Account.Security -PL --json
```

Create an error and not-found boundary:

```bash
create-next-pro addpage Checkout --error --not-found --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

Confirm every `created` or `updated` event path exists. A repeated command should preserve existing code and normally report those resources as `unchanged`.
