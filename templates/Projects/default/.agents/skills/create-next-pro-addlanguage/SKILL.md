---
name: create-next-pro-addlanguage
description: Add and register a two-letter locale in a generated create-next-pro project. Use when Codex needs to copy the default locale, update routing and the typed message registry, and then translate every copied message before delivery.
---

# Add a language

## Preconditions

- Work from the generated project root containing `cnp.config.json`.
- Confirm internationalization is enabled.
- Use a recognized lowercase two-letter language code.
- Keep the default locale directory, locale aggregator, routing file, and message registry consistent before running the command.

## Command

```bash
create-next-pro addlanguage <locale> [--json]
```

Human mode offers an autocomplete menu when the locale is omitted. JSON mode always requires the locale argument.

## Effects

For `addlanguage de`, the command:

- copies every file from `messages/<default-locale>/` to `messages/de/`;
- creates `messages/de.ts` with imports redirected to `./de/`;
- adds `de` to `src/lib/i18n/routing.ts`;
- imports and exposes `de` in `src/lib/i18n/messages.ts`.

The copied JSON values remain in the source language. They are not translated and are not ready for delivery.

A fully configured locale returns `unchanged`. A partially configured locale fails with `INCONSISTENT_LOCALE` before writing; inspect and repair the inconsistent files instead of retrying blindly.

## Workflow

1. Identify the current default locale and the target two-letter code.
2. Run the complete command with `--json`.
3. Inspect every `copied`, `created`, and `updated` event.
4. Read the required `translate` next step and translate every listed JSON file into the target language.
5. Keep placeholders, ICU syntax, keys, and nested object shapes unchanged while translating values.
6. Review routing and the typed message registry.
7. Run the project checks in every supported locale.

## Examples

Select a locale interactively:

```bash
create-next-pro addlanguage
```

Add German non-interactively:

```bash
create-next-pro addlanguage de --json
```

## Validate

```bash
bun run check
# or: npm run check
# or: pnpm run check
```

Do not mark the locale complete until every path in the `translate` next step has been reviewed and translated. Never expose `.env` values while testing authentication in the new locale.
