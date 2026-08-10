---
name: create-next-pro-addcomponent
description: Add a global or page-scoped UI component to a generated create-next-pro project. Use when Codex needs to create a component and its locale message keys without overwriting existing component code.
---

# Add a component

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Use one safe component-name segment.
- Use a simple or `Parent.Child` page scope when `--page` is present, and identify its existing route area explicitly.

## Command

```bash
create-next-pro addcomponent <Component> [--page <Page|Parent.Child> --area <public|user|admin>] [--json]
```

`-P` is the short form of `--page`. The option requires a page name and `--area`. A global component must not receive `--area`. Area values are the exact lowercase values `public`, `user`, and `admin`; `--area=value` is not supported.

## Effects

Without `--page`, the command creates:

- `src/ui/_global/<Component>.tsx`
- a `<Component>` key in `messages/<locale>/_global_ui.json`

With `--page Account.Security --area user`, the command first resolves exactly that page in the area-aware route catalog, then creates:

- `src/ui/Account/Security/<Component>.tsx`
- a `<Component>` key in the `Account.Security` translation namespace

The component name is normalized to a TypeScript identifier. Existing component code and existing message keys are preserved and reported as `unchanged`. Missing pages return `TARGET_NOT_FOUND`; flat, unknown-group, or ambiguous routes return `INCONSISTENT_ROUTE` before any write.

## Workflow

1. Decide whether the component is global or owned by one page.
2. Verify the page scope, area, and translation namespace when using `--page`.
3. Run the complete command with `--json`.
4. Inspect the component and per-locale message events.
5. Implement the component behavior and review all generated translations.
6. Run the project checks.

## Examples

Create a global component:

```bash
create-next-pro addcomponent Alert
```

Create a component for a nested page:

```bash
create-next-pro addcomponent PasswordForm --page Account.Security --area user --json
```

Create a component for an existing administrator page:

```bash
create-next-pro addcomponent AuditPanel --page Operations.Audit --area admin --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

Confirm the component path and all translation paths reported by the JSON result. Do not claim that an existing component was regenerated when its event is `unchanged`.
