![create-next-pro logo](./public/cnp-banner.svg)

# Runtime Support

[![Bun](https://img.shields.io/badge/Bun-%23000000?logo=bun&logoColor=white&style=for-the-badge)](https://bun.sh)
[![Node.js](https://img.shields.io/badge/Node.js-%23339933?logo=node.js&logoColor=white&style=for-the-badge)](https://nodejs.org)
[![Deno](https://img.shields.io/badge/Deno-%23000000?logo=deno&logoColor=white&style=for-the-badge)](https://deno.land)

![npm](https://img.shields.io/npm/v/create-next-pro-cli?logo=npm&color=orange)
![npm dependencies](https://img.shields.io/librariesio/release/npm/create-next-pro-cli?logo=npm)
![npm downloads](https://img.shields.io/npm/dw/create-next-pro-cli?logo=npm)

![GitHub](https://img.shields.io/github/stars/Rising-Corporation/create-next-pro-cli?style=social&logo=github)
![GitHub forks](https://img.shields.io/github/forks/Rising-Corporation/create-next-pro-cli?style=social&logo=github)
![GitHub issues](https://img.shields.io/github/issues/Rising-Corporation/create-next-pro-cli?logo=github)

![status](https://img.shields.io/badge/status-beta-orange)
![license](https://img.shields.io/github/license/Rising-Corporation/create-next-pro-cli?logo=open-source-initiative&logoColor=white)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-blue.svg?logo=conventionalcommits)](https://www.conventionalcommits.org/en/v1.0.0/)

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
.
├── eslint.config.mjs
├── messages
│   ├── en
│   │   ├── Dashboard.json
│   │   ├── _global_ui.json
│   │   ├── _home.json
│   │   ├── Login.json
│   │   ├── Register.json
│   │   ├── Settings.json
│   │   └── UserInfo.json
│   ├── en.ts
│   ├── fr
│   │   ├── Dashboard.json
│   │   ├── _global_ui.json
│   │   ├── _home.json
│   │   ├── Login.json
│   │   ├── Register.json
│   │   ├── Settings.json
│   │   └── UserInfo.json
│   ├── fr.ts
│   └── getMergedMessages.ts
├── middleware.ts
├── next.config.ts
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
├── public
│   ├── cnp-logo.png
│   └── cnp-logo.svg
├── README.md
├── src
│   ├── app
│   │   ├── api
│   │   │   └── auth
│   │   │       ├── [...nextauth]
│   │   │       │   └── route.ts
│   │   │       └── post-login
│   │   │           └── route.ts
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
│   │   │   │   ├── Login
│   │   │   │   │   └── page.tsx
│   │   │   │   └── Register
│   │   │   │       └── page.tsx
│   │   │   └── (user)
│   │   │       ├── Dashboard
│   │   │       │   ├── error.tsx
│   │   │       │   ├── loading.tsx
│   │   │       │   └── page.tsx
│   │   │       ├── layout.tsx
│   │   │       ├── Settings
│   │   │       │   ├── loading.tsx
│   │   │       │   └── page.tsx
│   │   │       └── UserInfo
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
│   │   │   ├── disconnect.ts
│   │   │   └── isConnected.ts
│   │   ├── i18n
│   │   │   ├── navigation.ts
│   │   │   ├── request.ts
│   │   │   └── routing.ts
│   │   └── utils.ts
│   └── ui
│       ├── Dashboard
│       │   ├── LogoutButton.tsx
│       │   ├── page-ui.tsx
│       │   ├── StatsCard.tsx
│       │   └── WelcomeCard.tsx
│       ├── _global
│       │   ├── BackButton.tsx
│       │   ├── Button.tsx
│       │   ├── GlobalHeader.tsx
│       │   ├── GlobalMain.tsx
│       │   ├── Loading.tsx
│       │   ├── LocaleSwitcher.tsx
│       │   ├── PublicNav.tsx
│       │   ├── ThemeToggle.tsx
│       │   └── UserNav.tsx
│       ├── _home
│       │   └── page-ui.tsx
│       ├── Login
│       │   └── page-ui.tsx
│       ├── Register
│       │   └── page-ui.tsx
│       ├── Settings
│       │   └── page-ui.tsx
│       └── UserInfo
│           └── page-ui.tsx
├── tailwind.config.ts
└── tsconfig.json
```

---

## ✅ Main Features

- Interactive CLI available for Bun, Node.js, or Deno
- Multi-runtime support: Bun, Node.js, Deno
- Features:
  - TypeScript integration
  - ESLint configuration
  - Tailwind CSS setup
  - App Router support (with or without `src/` directory)
  - Internationalization using `next-intl`
  - Turbopack or Webpack support
  - Custom path aliases (e.g., `@/*`, `@core/*`)
  - Next-auth with custom cookies
  - Automatic generation of pages and components
  - Clean i18n structure: `/messages/en/*.json`, `/lib/i18n/`
  - Add or remove pages and components via CLI
  - Bash and Zsh autocompletion
  - Interactive installation and runtime detection

---

## 📁 CLI Structure

```plaintext
create-next-pro/
.
├── bin.ts
├── create-next-pro-completion.sh
├── install.sh
├── package.json
├── public
│   ├── cnp-banner.svg
│   └── logo.svg
├── src
│   ├── index.ts
│   ├── lib
│   │   ├── addComponent.ts
│   │   ├── addPage.ts
│   │   ├── createProject.ts
│   │   ├── createProjectWithPrompt.ts
│   │   ├── rmPage.ts
│   │   ├── utils.test.ts
│   │   └── utils.ts
│   ├── scaffold-dev.ts
│   └── scaffold.ts
└── tsconfig.json

```

---

## 🚀 Install & Usage

### Local from git ( dev & bun only )

```bash
git clone https://github.com/Rising-Corporation/create-next-pro-cli.git
bun install
bun dev
```

- then Global ( on your machine )

```bash
bun link create-next-pro-cli
create-next-pro my-next-project
```

### From npm (via bunx , npx ... or global install)

```bash
bunx create-next-pro-cli # to try without install
```

- or

```bash
bun install -g create-next-pro-cli #ℹ️
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

> Or add the autocompletion line to your `.bashrc`/`.zshrc` :
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
>
> ||
>
> ```bash
> source ~/.zshrc
> ```

---

## 🛣️ Roadmap in coming for beta v0.2.0

- [ ] Implementation of interactive prompts
- [ ] Create library features
- [ ] Create API features
- [ ] Generation of `.env.*`
- [ ] Multi-platform testing (`bunx`, `link`, `npm`, etc.)
- [ ] Additional Components templates (admin panel, landing page, etc.)
- [ ] Auto deployment to Vercel

---

## 👨‍💻 Author

MrRise@RisingCorporation  
Made with ❤️ and Bun 🐇
