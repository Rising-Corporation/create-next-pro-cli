---
name: create-next-pro-create-project
description: Scaffold a new create-next-pro Next.js project. Use when Codex needs to create a generated project, select a safe destination, handle an existing target, or perform the initial install, environment setup, checks, and local start.
---

# Create a project

## Preconditions

- Work from the parent directory that should contain the new project.
- Choose a safe single-segment project name.
- Complete the CLI onboarding once in human mode if the JSON result reports `ONBOARDING_REQUIRED`.
- Inspect an existing destination before deciding whether deletion with `--force` is authorized.

## Command

```bash
create-next-pro <project-name> [--force] [--json]
```

Use letters, digits, hyphens, or underscores in the project name. Do not pass an absolute path, a separator, `.` or `..`. JSON mode requires the project name. Without a name, human mode opens the interactive project assistant.

Use `--force` only when replacement of the exact child destination is intended. The CLI deletes that destination before copying the template and does not merge its contents.

## Workflow

1. Resolve the intended parent directory and project name.
2. Run the command with `--json` for agentic execution.
3. Require `status: "success"` and inspect every event.
4. Confirm the project contains `package.json`, `tsconfig.json`, `cnp.config.json`, `AGENTS.md`, `.agents/skills`, and `.env.example`.
5. Confirm `.env`, `.git`, caches, build output, and internal agent context were not copied.
6. Enter the project and install with one package manager.
7. Copy `.env.example` to the local `.env`, review the development values, run the full checks, and start the development server.

The scaffold updates the package name and import alias, removes the source template's `packageManager` field, and leaves the generated project free to use Bun, npm, or pnpm.

## Examples

Human output:

```bash
create-next-pro customer-portal
```

Agentic output:

```bash
create-next-pro customer-portal --json
```

Explicitly replace an inspected destination:

```bash
create-next-pro customer-portal --force --json
```

Do not retry `TARGET_EXISTS` with `--force` automatically. Obtain authorization or choose another project name.

## Validate

With Bun only:

```bash
cd customer-portal
bun install
cp .env.example .env
bun run check
bun run dev
```

Equivalent npm or pnpm workflows:

```bash
npm install && npm run check
pnpm install && pnpm run check
```
