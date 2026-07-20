---
name: create-next-pro-addlib
description: Add a library directory or library.module to a generated create-next-pro project. Use when Codex needs to create a reusable module and maintain its index exports while preserving existing implementation files.
---

# Add a library

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Use `library` for an empty library shell or `library.module` for a generated module.
- Use at most two safe dot-separated segments.

## Command

```bash
create-next-pro addlib <library|library.module> [--json]
```

## Effects

`addlib analytics` creates or preserves:

- `src/lib/analytics/`
- `src/lib/analytics/index.ts`

`addlib analytics.trackEvent` additionally creates or preserves:

- `src/lib/analytics/trackEvent.ts`
- the corresponding import and export in `src/lib/analytics/index.ts`

Existing module implementations are never overwritten. The index is updated only when the required import or export is missing.

## Workflow

1. Choose whether the task needs only a library namespace or a concrete module.
2. Run the command with `--json`.
3. Inspect the directory, module, and index events.
4. Implement and review the generated module placeholder.
5. Ensure the index exports the module exactly once.
6. Run the project checks.

## Examples

Create a library shell:

```bash
create-next-pro addlib analytics
```

Create and register a module:

```bash
create-next-pro addlib analytics.trackEvent --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

On a repeated command, expect the existing module to remain intact. Review the result events before editing the index manually.
