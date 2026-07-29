# Security policy

## Supported versions

Only the latest version published under the npm `latest` dist-tag receives security fixes. Older patch versions should be upgraded before reporting a problem unless the regression itself prevents upgrading.

This policy covers the CLI, its npm package, the distributed Next.js template, generated files, completion adapters, and the release workflow.

## Report a vulnerability privately

Use GitHub's [private vulnerability reporting form](https://github.com/Rising-Corporation/create-next-pro-cli/security/advisories/new). Do not disclose an exploitable vulnerability in a public issue, pull request, discussion, commit, or log.

Include:

- the affected CLI version and package manager;
- the operating system and runtime version;
- a minimal reproduction without real credentials;
- the expected and observed security boundary;
- the likely impact and any known mitigations.

Never include access tokens, production `.env` values, personal data, or credentials belonging to another service.

## Response targets

- acknowledgement within three business days;
- an initial status or request for more information within seven business days;
- coordinated disclosure targeted within 90 days, adjusted when user safety requires more or less time.

Fixes are prepared privately when necessary, validated across the supported runtimes and package managers, then published through the protected release workflow. A GitHub Security Advisory may credit the reporter unless anonymity is requested.

## Public development credentials

The canonical generated `.env.example` contains intentionally public, restricted development credentials. They are not production secrets and must be replaced before deployment. Reports should focus on a demonstrated boundary failure rather than the mere presence of those documented development values.
