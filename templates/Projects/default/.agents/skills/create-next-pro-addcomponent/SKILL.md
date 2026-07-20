---
name: create-next-pro-addcomponent
description: Add a global or page-scoped UI component to a generated create-next-pro project. Use when Codex needs to create a component and its locale message keys without overwriting existing component code.
---

# Add a component

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Use one safe component-name segment.
- Use a simple or `Parent.Child` page scope when `--page` is present.

## Command

```bash
create-next-pro addcomponent <Component> [--page <Page|Parent.Child>] [--json]
```

`-P` is the short form of `--page`. The option requires a page name.

## Effects

Without `--page`, the command creates:

- `src/ui/_global/<Component>.tsx`
- a `<Component>` key in `messages/<locale>/_global_ui.json`

With `--page Account.Security`, the command creates:

- `src/ui/Account/Security/<Component>.tsx`
- a `<Component>` key in the `Account.Security` translation namespace

The component name is normalized to a TypeScript identifier. Existing component code and existing message keys are preserved and reported as `unchanged`.

## Workflow

1. Decide whether the component is global or owned by one page.
2. Verify the page scope and translation namespace when using `--page`.
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
create-next-pro addcomponent PasswordForm --page Account.Security --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

Confirm the component path and all translation paths reported by the JSON result. Do not claim that an existing component was regenerated when its event is `unchanged`.
