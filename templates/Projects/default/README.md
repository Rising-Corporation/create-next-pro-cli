# My Next.js Project

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-pro`](https://github.com/Rising-Corporation/create-next-pro-cli).

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/[locale]/page.tsx`. The page auto-updates as you edit the file.

## ✨ Features

This project comes with the following features pre-configured:

- **🌍 Internationalization (i18n)** - Using `next-intl` with locale-based routing
- **🎨 Tailwind CSS** - Utility-first CSS framework
- **⚡ TypeScript** - Type-safe development
- **🔐 Authentication** - NextAuth.js integration
- **📱 Responsive Design** - Mobile-first approach
- **⚙️ ESLint & Prettier** - Code quality and formatting
- **🎯 App Router** - Latest Next.js routing system

## 🛠️ CLI Commands

You can use `create-next-pro` to add and manage your project structure:

### Add a new page:

```bash
create-next-pro addpage MyPage
```

### Add a nested page:

```bash
create-next-pro addpage ParentPage.ChildPage
```

### Add a component (global):

```bash
create-next-pro addcomponent MyComponent
```

### Add a component in a specific page:

```bash
create-next-pro addcomponent MyComponent -P MyPage
```

### Add a library:

```bash
create-next-pro addlib mylib
```

### Add an API route:

```bash
create-next-pro addapi hello
```

### Add a new language (i18n):

```bash
create-next-pro addlanguage fr
```

### Add translation text:

```bash
create-next-pro addtext MyPage.welcome "Welcome to my page"
```

### Remove a page:

```bash
create-next-pro rmpage MyPage
```

## 📁 Project Structure

```
src/
├── app/
│   ├── [locale]/           # Internationalization routing
│   │   ├── (public)/       # Public pages (login, register)
│   │   └── (user)/         # Protected pages (dashboard, settings)
│   └── api/                # API routes
├── lib/                    # Utility libraries
│   ├── auth/               # Authentication helpers
│   └── i18n/               # Internationalization config
└── ui/                     # UI components organized by page
```

## 🌐 Internationalization

The project supports multiple languages through the `messages/` directory:

- `messages/en/` - English translations
- `messages/fr/` - French translations
- Add more languages with `create-next-pro addlanguage <locale>`

## 🔐 Authentication

Authentication is configured with NextAuth.js. Check `src/auth.config.ts` for configuration and `/api/auth/` for auth routes.

## 📚 Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [NextAuth.js Documentation](https://next-auth.js.org/)

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

Created with ❤️ using [create-next-pro](https://github.com/Rising-Corporation/create-next-pro-cli)
