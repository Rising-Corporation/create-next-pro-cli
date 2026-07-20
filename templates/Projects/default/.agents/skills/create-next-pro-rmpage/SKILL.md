---
name: create-next-pro-rmpage
description: Remove a catalogued page and its associated route, UI, and message resources from a generated create-next-pro project. Use when Codex needs a confirmed, project-confined page deletion in direct or interactive mode.
---

# Remove a page

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Confirm the target is a page that contains an actual `page.tsx` and appears in the CLI page catalog.
- Review uncommitted work and references to the route before deletion.
- Use a simple logical name or `Parent.Child`, never a filesystem path.

## Command

```bash
create-next-pro rmpage [Page|Parent.Child] [--json]
```

Without a name, human mode displays an autocomplete tree and asks for confirmation. JSON mode requires the explicit page name and never prompts.

## Effects

The command can remove:

- the page's App Router directory;
- the matching `src/ui` page directory;
- a top-level locale JSON file and its aggregator registration; or
- only the nested message key for `Parent.Child`.

The page catalog excludes technical directories and routes without `page.tsx`. Resolution and deletion remain confined to the project. Shared parents and unrelated files are preserved.

## Workflow

1. Discover the target with human autocomplete or confirm its logical name from the project structure.
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
create-next-pro rmpage Account.Security --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

Treat `TARGET_NOT_FOUND` as a request or state mismatch. Do not substitute a filesystem deletion command, and do not infer deletion from exit code alone.
