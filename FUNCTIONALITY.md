# create-next-pro functionality

`create-next-pro` creates and evolves Next.js 16 projects while keeping file operations confined to the selected project root. The same public behavior is available through the Bun bundle, the Node.js bundle, and the Bun-first launcher.

## Public operations

| Operation                               | Purpose                                       | Important contract                                                                       |
| --------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `create-next-pro <project>`             | Create a project from the maintained template | Rejects an existing destination unless `--force` is explicit; never copies `.env`        |
| `addpage <name> --area <public\|user>`  | Add a simple or nested page                   | An explicit area is mandatory for direct execution; `Parent.Child` creates a nested page |
| `addcomponent <name>`                   | Add a global or page component                | `--page` requires the matching `--area`; existing code is preserved                      |
| `addlib <library[.module]>`             | Add a library or module                       | Existing barrels remain a byte-for-byte prefix and receive only a safe direct re-export  |
| `addapi <name>`                         | Add an App Router API route                   | Generated example behavior must be reviewed for validation and authentication            |
| `addlanguage <locale>`                  | Add a locale from the default locale          | Copied source-language JSON must be translated before delivery                           |
| `addtext <key> <value>`                 | Set a message in every locale                 | Repeating the same value is idempotent; changing it reports an update                    |
| `rmpage [name] [--area <public\|user>]` | Remove a page                                 | Direct mode is area-qualified; no-argument mode presents a confirmed tree selector       |

## Shared behavior

- `--json` emits one deterministic schema-versioned document and never prompts.
- Human output identifies every affected path and remaining next step.
- Statuses are `success`, `unchanged`, `cancelled`, and `failed`; only failure exits with code `1`.
- Mutation events are emitted only after their file-system operation succeeds.
- Existing user code is preserved unless the requested command explicitly updates or removes it.
- Absolute paths, traversal segments, control characters, ambiguous routes, and escaping symbolic links are rejected before mutation.
- The import alias stored in `cnp.config.json` is reused by every generator.
- Bash and Zsh completion use an internal, undecorated candidate protocol that is not part of public help.

## Page areas

Every page belongs to exactly one route group:

- `--area public` creates a route under `src/app/[locale]/(public)`;
- `--area user` creates a route under `src/app/[locale]/(user)`.

The route area does not change the public URL. UI resources remain under `src/ui`, and translated messages remain under `messages/<locale>`. The CLI refuses historical flat routes and ambiguous candidates rather than moving or deleting them automatically.

## Agentic output

Agents should use `--json` and inspect `status`, `events`, `nextSteps`, `error`, and the process exit code. Paths in events are relative to named roots. Results never contain file contents, environment values, or secrets.

```bash
create-next-pro addpage account.security --area user --json
create-next-pro addlanguage de --json
```

`nextSteps` are obligations, not descriptions of completed work. In particular, `addlanguage` marks translation as required, while creation reports installation, environment initialization, validation, and local-start commands.

## Runtime and package managers

The CLI launcher prefers Bun and falls back to Node.js. A generated project does not pin one package manager and is continuously validated with Bun, npm, and pnpm. The template source tracks one official `bun.lock`; alternative lockfiles are generated only in isolated consumer worktrees.

## Security and distribution

Scaffolding uses an allowlist. Generated projects and npm packages exclude local `.env` files, nested Git repositories, caches, build results, old templates, screenshots, and private agent context. The canonical `.env.example`, `AGENTS.md`, and local command skills are required distribution files.

The authoritative command syntax and examples are available through:

```bash
create-next-pro --help
```

See [README.md](./README.md) for installation and architecture, [CONTRIBUTING.md](./CONTRIBUTING.md) for development, and [SECURITY.md](./SECURITY.md) for private vulnerability reporting.
