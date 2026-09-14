# Changelog

## Unreleased

### Security

- Updated template Next.js and eslint-config-next from `16.2.11` to `16.3.5`, sharp from `0.35.3` to `0.35.4`, and the js-yaml override from `4.3.1` to `4.3.2`.
- Updated Vitest and its mocker from `4.1.10` to `4.1.11` in both dependency graphs, and the CLI fast-uri override from `3.1.5` to `3.1.7`. Regenerated both Bun lockfiles and aligned template npm/Bun and pnpm overrides. Security audits continue to reject every advisory.
- Refreshed the resolved Next.js version in existing local Dependabot evidence without changing reviewed alert ranges or remote alert state.

### Changed

- Updated compatible template packages, including React and React DOM `19.3.0`, next-intl `4.14.4`, lucide-react `1.45.0`, simple-icons `16.31.0`, tailwind-merge `3.7.0`, and Playwright `1.63.0`. Updated compatible CLI lint, formatting, commit, and build dependencies. Kept TypeScript 6, Node.js 24, template ESLint 9, Tailwind 4, and Auth.js `5.0.0-beta.32`.

### Fixed

- Allowed the exact built-in `_home` scope in `addtext _home.<key>` and `addcomponent <Name> --page _home --area public`. Other underscore-prefixed names remain rejected, `home` is not an alias, and page creation/removal keep their existing restrictions. Home components require the existing index, private home page, and UI directory before any write.
- Excluded `.bun/` and `.cache/`, including nested caches, from linting, template copying, and npm archives. Regression checks still detect React errors in normal source files and reject forbidden package entries.
- Restricted locale parameters with `dynamicParams = false`, so missing resources such as `/missing.png` and `/missing.ico` return HTTP 404. Made the `user` layout explicitly dynamic, like the administrator layout, so newly generated user pages also evaluate authorization at request time when authentication is disabled during the build.
- Added portable production HTTP regression tests for missing paths, public assets, disabled authentication, anonymous redirects, PNG optimization and caching, and valid AVIF decoding. CI runs these checks with Bun, npm, and pnpm.
- Extended rendering verification to include every generated route in the `user` and `admin` groups, including added locales.
- Added a main landmark to the localized not-found page, including the administrator access-denied surface.

### Migration for existing projects

Updating the CLI does not migrate applications it previously generated. Review and apply the template dependency changes to each application's `package.json`, keeping Next.js and eslint-config-next aligned. Update matching npm/Bun overrides and, for pnpm, `pnpm-workspace.yaml`. Regenerate the application's own lockfile with its selected manager, review the resolved graph, then verify a frozen install (`bun install --frozen-lockfile`, `npm ci`, or `pnpm install --frozen-lockfile`). Do not replace an existing application with a forced scaffold.

Add the recursive cache exclusions to the application's ESLint and ignore files. In `src/app/[locale]/layout.tsx`, retain locale validation and `generateStaticParams` and add `export const dynamicParams = false`. Set `export const dynamic = "force-dynamic"` in the `(user)/layout.tsx` beneath that directory, preserving its server authorization checks. Extend the generated locale list when adding a language. Bring across the HTTP tests and their small AVIF fixture, or implement equivalent checks for customized assets and authentication. Run formatting, lint, types, unit tests, production build, rendering checks, HTTP checks and the blocking security audit with the application's selected manager.

Next.js `16.3.5` includes the [upstream AVIF re-enablement with sharp `0.35.4`](https://github.com/vercel/next.js/pull/97949). A residual `NoFallbackError` can appear in server logs for unsupported locale-like paths despite a correct HTTP 404. Protected-route redirects or denials after streaming begins must be checked separately from missing-resource status codes. These changes do not configure or restart production services, and this unreleased section does not announce a patched npm publication.

## 0.1.37

### Added

- Added the explicit `--area admin` option to page creation, page-scoped components, page removal, interactive selection, JSON output, and Bash/Zsh completion.
- Added a server-only administrator authorization boundary based on `AUTH_ADMIN_EMAILS`, with access denied when the configuration or session does not satisfy the policy. Administrator routes use dynamic rendering.
- Extended collision checks across the closed `public`, `user`, and `admin` page areas, and included the administrator layout and agent instructions in generated projects and package validation.

## 0.1.36

### Changed

- Added repository governance checks and controlled application of contribution, branch, tag, environment, and security policies.
- Added guided setup and validation for the repository-scoped GitHub release App and hardened release activation checks.
- Enabled guarded automatic patch releases with persisted release state, recovery checks, and npm Trusted Publishing. Restricted external workflow execution and automatic major dependency updates.

## 0.1.35

### Fixed

- Fixed `create-next-pro addlib library.module` reducing an existing `src/lib/<library>/index.ts` to only its most recently generated exports. Versions `0.1.20` through `0.1.34` are affected.
- Existing library indexes are now parsed with TypeScript and preserved byte for byte. The command only appends one direct value or type re-export when that change is unambiguous.
- Added exclusive locking, concurrent-change detection, rollback for newly created modules, and structured metadata describing the module, index, and export actions.

### Recovery for affected projects

The CLI cannot infer exports that were already removed from an index. Restore each affected `src/lib/<library>/index.ts` from version control, review the active modules that should remain public, and run the project checks before using `addlib` again.
