---
name: create-next-pro-addapi
description: Add an App Router API route to a generated create-next-pro project. Use when Codex needs to create a safe route.ts path, then replace the example response and review validation and authentication.
---

# Add an API route

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Express nested route segments with dots, not filesystem separators.
- Use only safe non-empty segments.

## Command

```bash
create-next-pro addapi <route[.child...]> [--json]
```

## Effects

`addapi users.profile` creates or preserves:

```text
src/app/api/users/profile/route.ts
```

The command creates the route directory inside the project boundary and writes the template only when `route.ts` is missing. An existing handler is preserved and reported as `unchanged`.

## Workflow

1. Convert the intended URL hierarchy to a dot-separated logical name.
2. Run the command with `--json`.
3. Confirm the reported API route path is correct.
4. Replace the generated example response with the required behavior.
5. Add input validation, authorization, authentication, error handling, and tests appropriate to the endpoint.
6. Run the project checks.

## Examples

Create a health endpoint:

```bash
create-next-pro addapi health
```

Create a nested endpoint non-interactively:

```bash
create-next-pro addapi users.profile --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

Do not report the API as implemented merely because the template was generated. Complete the required review next step and preserve an existing route handler.
