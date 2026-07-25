---
name: create-next-pro-rmpage
description: Remove a catalogued page and its associated route, UI, and message resources from a generated create-next-pro project. Use when Codex needs a confirmed, project-confined page deletion in direct or interactive mode.
---

# Remove a page

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Confirm the target is a page that contains an actual `page.tsx` and appears in the CLI page catalog.
- Confirm whether the page belongs to the `public` or `user` route area.
- Review uncommitted work and references to the route before deletion.
- Use a simple logical name or `Parent.Child`, never a filesystem path.

## Command

```bash
create-next-pro rmpage [Page|Parent.Child] [--area <public|user>] [--json]
```

With a page name, `--area` is required. Without a name, human mode displays an autocomplete tree grouped as `Public > ...` and `User > ...`, then asks for confirmation. Passing only `--area` filters that menu. JSON mode requires the explicit page name and area and never prompts. Area values are exact lowercase values and `--area=value` is not supported.

## Effects

The command can remove:

- the page's App Router directory;
- the matching `src/ui` page directory;
- a top-level locale JSON file and its aggregator registration; or
- only the nested message key for `Parent.Child`.

The page catalog excludes technical directories and routes without `page.tsx`. Resolution uses the exact `{area, logicalName}` pair and deletion remains confined to the project. Shared parents and unrelated files are preserved. Flat historical routes, unknown route groups, and ambiguous route definitions fail with `INCONSISTENT_ROUTE` and are never deleted automatically.

## Workflow

1. Discover the target with the area-aware human autocomplete or confirm its logical name and area from the project structure.
2. Inspect references, navigation entries, tests, and uncommitted changes that may depend on the page.
3. Prefer an explicit name with `--json` for agentic deletion.
4. Require a successful result and inspect every `deleted`, `updated`, and `unchanged` event.
5. Confirm deleted paths are absent and preserved parents still exist.
6. Remove or update references only after reviewing the CLI result.
7. Run the project checks.

## Examples

Select and confirm a page interactively:

```bash
create-next-pro rmpage
```

Remove a nested page non-interactively:

```bash
create-next-pro rmpage Account.Security --area user --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

Treat `TARGET_NOT_FOUND` as a request or state mismatch. Treat `INCONSISTENT_ROUTE` as a request for manual route inspection, not permission to remove a flat or ambiguous route. Do not substitute a filesystem deletion command, and do not infer deletion from exit code alone.
