# Contributing to create-next-pro-cli

Thank you for improving `create-next-pro-cli`. Contributions use a trunk-based workflow: `master` is the single source of truth and every human change reaches it through a pull request.

## Requirements

- Bun 1.3.14 for the locked repository installation and root checks.
- Node.js 24 for the Node.js bundle and npm consumers.
- pnpm 11 when changing multi-package-manager behavior.
- Git and a GitHub account.

## Branches and commits

Create a short-lived branch from the latest `master`:

```bash
git fetch origin
git switch master
git pull --ff-only origin master
git switch -c fix/describe-the-change
```

Use `feature/*`, `fix/*`, `docs/*`, or `chore/*` as appropriate. The historical `dev` branch is not part of the contribution flow.

Commits and pull request titles must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), for example:

```text
fix(cli): preserve existing library exports
docs(security): document private reporting
```

Pull requests are squash-merged. The pull request title becomes the public commit on `master`, so keep it accurate and conventional.

## Local validation

Install exactly the locked dependencies and run the complete root checks:

```bash
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run typecheck
bun run language:check
bun test
bun run build
bun run audit
```

When a change affects the generated template, also validate it with Bun, npm, and pnpm. Keep `bun.lock` as the only committed package-manager lockfile; npm and pnpm lockfiles belong only in temporary consumer worktrees.

```bash
cd templates/Projects/default
bun install --frozen-lockfile
bun run check
bun run test:consumer
bun run test:e2e
bun run audit
```

Do not weaken an audit, remove a consumer, or update a snapshot merely to make a check pass. Document a repeated blocker in `.agent/TROUBLESHOOTING.md` without including secrets.

## Pull requests

Open pull requests against `master`. Complete the template, link relevant issues, describe public behavior changes, and list the exact checks executed. All required checks and conversations must be resolved before merging.

Workflows from first-time forks may require maintainer approval before they run. Maintainers review the workflow diff before approving it.

Do not publish npm packages, create release tags, or edit versions manually. A validated merge to `master` triggers the protected patch release workflow.

## Security and sensitive data

Never put credentials, private environment values, access tokens, or exploit details in an issue, pull request, fixture, log, or screenshot. The development credentials in the canonical `.env.example` are intentionally public and limited; production credentials must always be replaced.

Report vulnerabilities through the private process in [SECURITY.md](./SECURITY.md). Do not create a public issue for a vulnerability that could be exploited.

## Community

- Use [Issues](https://github.com/Rising-Corporation/create-next-pro-cli/issues) for confirmed bugs and actionable feature requests.
- Use [Discussions](https://github.com/Rising-Corporation/create-next-pro-cli/discussions) for questions and ideas.
- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
