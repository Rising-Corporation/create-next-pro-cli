![create-next-pro logo](./public/logo.svg)

![npm version](https://img.shields.io/npm/v/create-next-pro-cli?label=npm%20version)
![status](https://img.shields.io/badge/status-beta-orange)
![license](https://img.shields.io/github/license/Rising-Corporation/create-next-pro-cli)
![dependencies](https://img.shields.io/librariesio/release/npm/create-next-pro-cli)
![downloads](https://img.shields.io/npm/dw/create-next-pro-cli)

> ⚠️ This project is under active development and currently in beta testing. Not all features are implemented yet, and contributions are welcome!

Initially, changes will be accepted or rejected by the creator, but in a few weeks, contributions will be submitted to a community vote.

# create-next-pro-cli

> 🚀 An advanced CLI scaffolder to create professional Next.js projects instantly.

---

> 🤩 Can't wait and too excited to read more? Just want to try it now?
>
> ℹ️ To enable autocompletion automatically, add the `--trust` option when installing globally with Bun:
>
> ```bash
> bun install -g create-next-pro-cli --trust
> ```

---

## 🎯 Purpose

Create an enhanced alternative to `bun create next-app` with an interactive interface to generate Next.js projects tailored to real-world professional needs.

This open-source, community-driven project aims to gather and share best practices to help standardize Next.js project structures. It includes many other features to facilitate modern development workflows and encourage collaboration.

The CLI also enables you to instantly create pages and components, automatically placing them in the correct location within your project’s architecture for seamless organization and scalability.

You can also customize the templates used for pages and components to fit your own needs.

---

## 🛠️ Commands & Examples

### Create a new project

```bash
create-next-pro MyProjectName
```

> ⚠️ The interactive prompt for features and customization is not yet implemented, but will be available very soon!

### Create a page

```bash
create-next-pro addpage MyPage
```

### Create a nested page

```bash
create-next-pro addpage ParentPage.ChildPage
```

### Create a component (global)

```bash
create-next-pro addcomponent MyComponent
```

### Create a component in a page

```bash
create-next-pro addcomponent MyComponent -P MyPage
```

### Create a component in a nested page

```bash
create-next-pro addcomponent MyComponent -P ParentPage.ChildPage
```

### Remove a page

```bash
create-next-pro rmpage MyPage
```

### Remove a nested page

```bash
create-next-pro rmpage ParentPage.ChildPage
```

---

## 📁 Expected Structure of a Generated Project

```plaintext
my-next-app/
├── eslint.config.mjs
├── messages
│   ├── en
│   │   ├── dashboard.json
│   │   ├── _global_ui.json
│   │   ├── _home.json
│   │   ├── login.json
│   │   ├── register.json
│   │   ├── settings.json
│   │   └── user_info.json
│   ├── en.ts
│   ├── fr
│   │   ├── dashboard.json
│   │   ├── _global_ui.json
│   │   ├── _home.json
│   │   ├── login.json
│   │   ├── register.json
│   │   ├── settings.json
│   │   └── user_info.json
│   ├── fr.ts
│   └── getMergedMessages.ts
├── middleware.ts
├── next.config.ts
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
├── public
│   ├── cnp-logo.ico
│   ├── cnp-logo.png
│   ├── cnp-logo.svg
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── auth
│   │   │   │   ├── [...nextauth]
│   │   │   │   │   └── route.ts
│   │   │   │   ├── [...nextauth].ts
│   │   │   │   └── post-login
│   │   │   │       └── route.ts
│   │   │   └── me
│   │   │       └── route.ts
│   │   ├── favicon.ico
│   │   ├── layout.tsx
│   │   ├── [locale]
│   │   │   ├── layout.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── page.tsx
│   │   │   ├── (public)
│   │   │   │   ├── _home
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── login
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register
│   │   │   │       └── page.tsx
│   │   │   └── (user)
│   │   │       ├── dashboard
│   │   │       │   ├── error.tsx
│   │   │       │   ├── loading.tsx
│   │   │       │   └── page.tsx
│   │   │       ├── layout.tsx
│   │   │       ├── settings
│   │   │       │   ├── loading.tsx
│   │   │       │   └── page.tsx
│   │   │       └── user_info
│   │   │           ├── loading.tsx
│   │   │           └── page.tsx
│   │   ├── not-found.tsx
│   │   ├── page.tsx
│   │   ├── sitemap.ts
│   │   └── styles
│   │       └── globals.css
│   ├── auth.config.ts
│   ├── config.ts
│   ├── lib
│   │   ├── auth
│   │   │   └── isConnected.ts
│   │   └── i18n
│   │       ├── navigation.ts
│   │       ├── request.ts
│   │       └── routing.ts
│   └── ui
│       ├── dashboard
│       │   ├── page.tsx
│       │   ├── StatsCard.tsx
│       │   └── WelcomeCard.tsx
│       ├── _global
│       │   ├── BackButton.tsx
│       │   ├── GlobalHeader.tsx
│       │   ├── GlobalMain.tsx
│       │   ├── LocaleSwitcher.tsx
│       │   ├── PublicNav.tsx
│       │   └── UserNav.tsx
│       └── _home
├── tailwind.config.ts
└── tsconfig.json
```

---

## ✅ Main Features

- Interactive CLI via `bun` or `bunx`
- Supports:
  - TypeScript
  - ESLint
  - Tailwind CSS
  - App Router (with or without `src/`)
  - i18n (`next-intl`)
  - Turbopack / Webpack
  - Custom aliases (`@/*`, `@core/*`, etc.)
- Automatic generation:
  - Folders
  - Base pages: `page.tsx`, `layout.tsx`, `loading.tsx`, `not-found.tsx`, `error.tsx`
  - `.env`, `.env.local`, `.env.production`, etc.
  - Clean i18n structure: `/messages/en/*.json`, `/lib/i18n/`

---

## 📁 CLI Structure

```plaintext
create-next-pro/
.
├── bin.ts                        # CLI entry point (#!/usr/bin/env bun)
├── bun.lock
├── create-next-pro-completion.sh # Auto completion for source
├── FONCTIONALITY.md
├── install.sh
├── package.json                  # Binary declaration
├── README.md
├── src
│   ├── index.ts                  # Interactive logic (prompts, generation)
│   ├── logo.svg
│   ├── scaffold-dev.ts
│   └── scaffold.ts
└── tsconfig.json                 # Bun/TypeScript config

```

---

## 🚀 Install & Usage

### Local from git (dev)

```bash
bun install
bun dev
```

### Global (on your machine)

```bash
bun link create-next-pro-cli
create-next-pro my-next-project
```

### From another PC (via bunx or global install)

```bash
bunx create-next-pro-cli # to try without install
# or
bun install -g create-next-pro-cli
```

> ℹ️ To enable autocompletion automatically, add the `--trust` option when installing globally with Bun:
>
> ```bash
> bun install -g create-next-pro-cli --trust
> ```

> Otherwise, run the autocompletion install script from binary manually:
>
> ```bash
> bash install.sh
> ```

> or add the autocompletion line to your `.bashrc`/`.zshrc` :
>
> ```bash
> source ~/.bun/install/global/node_modules/create-next-pro-cli/create-next-pro-completion.sh
> ```
>
> Then restart your terminal or run
>
> ```bash
> source ~/.bashrc
> ```

---

## 🛣️ Roadmap

- [x] Bun config + `tsconfig.json`
- [x] `bin.ts` CLI entry point
- [x] CLI project structure `src/index.ts`
- [ ] Implementation of interactive prompts
- [x] Basic Next.js project scaffolding
- [x] CLI file/page generation
- [x] Custom alias support
- [x] Next-auth with custom cookies
- [x] Full `next-intl` support with `lib/i18n/` and `messages/`
- [ ] Generation of `.env.*`
- [ ] Multi-platform testing (`bunx`, `link`, `npm`, etc.)
- [x] Publish to npm or Bun registry

---

## ✨ Coming Soon

- Additional Components templates (admin panel, landing page, etc.)
- Library templates
- API templates
- Prettier / Husky / Commitlint integration
- Auto deployment to Vercel

---

## 👨‍💻 Author

MrRise@RisingCorporation  
Made with ❤️ and Bun 🐇
