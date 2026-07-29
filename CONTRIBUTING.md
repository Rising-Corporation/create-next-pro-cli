# Contributing to create-next-pro-cli

Thank you for improving `create-next-pro-cli`. Contributions use a trunk-based workflow: `master` is the single source of truth and every human change reaches it through a pull request.

Public visibility does not grant write access. External contributors propose changes from a fork. Only repository administrators and explicitly authorized maintainers may push branches to the canonical repository or merge pull requests. Contributors must never push directly to `master`.

## Requirements

- Bun 1.3.14 for the locked repository installation and root checks.
- Node.js 24 for the Node.js bundle and npm consumers.
- pnpm 11 when changing multi-package-manager behavior.
- Git and a GitHub account.

## Branches and commits

Fork the repository, then create a short-lived branch from the latest upstream `master`:

```bash
git remote add upstream https://github.com/Rising-Corporation/create-next-pro-cli.git
git fetch upstream
git switch -c fix/describe-the-change upstream/master
git push --set-upstream origin fix/describe-the-change
```

Use `feat/*`, `fix/*`, `docs/*`, `chore/*`, or `ci/*` as appropriate. An authorized maintainer may create the same short-lived branch directly in the canonical repository, but must still use a pull request. The historical `dev` branch is not part of the contribution flow.

Commits and pull request titles must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), for example:

```text
fix(cli): preserve existing library exports
docs(security): document private reporting
```

Pull requests are squash-merged. The pull request title becomes the public commit on `master`, so keep it accurate and conventional.

Dependabot pull request titles follow the same convention. Its generated commit body is exempt from the human body-style rules, but dependency changes remain blocked until the official `bun.lock` has been regenerated and every normal check passes.

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

Do not weaken an audit, remove a consumer, or update a snapshot merely to make a check pass. If a check fails repeatedly, describe the failure, reproduction steps, and redacted logs in the pull request without including secrets.

## Pull requests

Open pull requests against `master`. Complete the template, link relevant issues, describe public behavior changes, and list the exact checks executed. All required checks and conversations must be resolved before merging. Only repository administrators and explicitly authorized maintainers may perform the squash merge.

Pull request workflows are read-only and cannot publish a package or update `master`. Workflows from first-time forks may require maintainer approval before they run. Maintainers review the workflow diff before approving it.

Do not publish npm packages, create release tags, or edit versions manually. Only the resulting authorized merge to `master` is eligible to trigger the protected patch release workflow, when release automation is enabled.

## Security and sensitive data

Never put credentials, private environment values, access tokens, or exploit details in an issue, pull request, fixture, log, or screenshot. The development credentials in the canonical `.env.example` are intentionally public and limited; production credentials must always be replaced.

Report vulnerabilities through the private process in [SECURITY.md](./SECURITY.md). Do not create a public issue for a vulnerability that could be exploited.

## Community

- Use [Issues](https://github.com/Rising-Corporation/create-next-pro-cli/issues) for confirmed bugs and actionable feature requests.
- Use [Discussions](https://github.com/Rising-Corporation/create-next-pro-cli/discussions) for questions and ideas.
- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
