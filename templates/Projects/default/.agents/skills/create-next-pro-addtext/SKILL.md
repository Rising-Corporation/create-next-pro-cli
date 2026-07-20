---
name: create-next-pro-addtext
description: Set a dot-separated translation key across every configured locale in a generated create-next-pro project. Use when Codex needs to create or replace one message value consistently and then localize the propagated text.
---

# Add or update translation text

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Confirm internationalization is enabled and at least one locale directory exists.
- Use a path with a message file and at least one key, such as `dashboard.welcome`.

## Command

```bash
create-next-pro addtext <file.key[.nested...]> [text...] [--json]
```

If text is omitted, the CLI derives a title-cased value from the final key. Provide the intended source text explicitly for agentic work.

## Effects

The first path segment selects `messages/<locale>/<file>.json`. Remaining segments select the nested key. The command writes the same value to every configured locale:

- a missing file or key is created;
- a different existing value is updated with `replaced: true` in event detail;
- an identical value is reported as `unchanged`.

Invalid JSON or a scalar encountered where an object is required causes an error before any prepared writes are applied.

## Workflow

1. Inspect existing message files and select the canonical dot path.
2. Run the command with explicit text and `--json`.
3. Inspect every per-locale event and whether a previous value was replaced.
4. Translate the propagated source value separately in each locale where required.
5. Preserve message keys, interpolation placeholders, and ICU syntax.
6. Run the project checks.

## Examples

Set a value in human mode:

```bash
create-next-pro addtext dashboard.welcome "Welcome back"
```

Set a nested value non-interactively:

```bash
create-next-pro addtext account.security.passwordHint "Use at least 12 characters" --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

The initial value is intentionally identical across locales. Complete the required translation next step rather than assuming propagation performed translation.
