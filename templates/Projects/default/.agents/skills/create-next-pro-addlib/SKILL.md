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
- one direct re-export in `src/lib/analytics/index.ts`

Existing module implementations are never overwritten. An existing index is parsed with TypeScript and preserved byte for byte. The command appends only the required direct value or type re-export. It returns `unchanged` when that module path is already publicly exported.

The command fails before changing the index when it finds invalid TypeScript, a conflicting public name, an ambiguous module export, an active command lock, or a concurrent edit. Resolve `INCONSISTENT_LIBRARY_INDEX`, `INCONSISTENT_LIBRARY_MODULE`, or `CONCURRENT_MODIFICATION` manually, then rerun the command.

## Workflow

1. Choose whether the task needs only a library namespace or a concrete module.
2. Run the command with `--json`.
3. Inspect the directory, module, and index events.
4. Implement and review the generated module placeholder.
5. Confirm that `exportAction` is `added` or `preserved` and inspect the reported index path.
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

On a repeated command, expect the existing module and index to remain intact. Review the structured result before editing the index manually.
