// lib/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Lightweight wrappers around Next.js' navigation
// APIs that consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
// This file sets up navigation for internationalization (i18n) in a Next.js application
// It uses the createLocalizedPathnamesNavigation function from next-intl/navigation
// to create localized links and navigation functions
// The locales and defaultLocale are imported from the routing module
// This allows the application to support multiple languages, such as English and French
// The Link component can be used to create links that respect the current locale
// The redirect function can be used to redirect users to the appropriate locale
// The usePathname and useRouter hooks can be used to access the current pathname and router
// This setup is essential for providing a seamless navigation experience in a multilingual application
// Make sure to import this module in your application to enable i18n navigation
// You can also customize the Link component to add additional props or styles
