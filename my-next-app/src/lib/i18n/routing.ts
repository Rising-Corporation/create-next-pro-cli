// lib/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "fr"],
  localeDetection: true,
  localeCookie: true,

  // Used when no locale matches
  defaultLocale: "en",
});
// This file defines the routing configuration for internationalization (i18n) in a Next.js application
// It uses the defineRouting function from next-intl/routing to set up the locales and default locale
// The locales array specifies the supported languages, such as English and German
// The defaultLocale is set to English, which will be used when no specific locale is requested
// The pathnames object maps the root path ("/") to itself and provides a localized version
// for the "/pathnames" route in German, which is mapped to "/pfadnamen"
// This setup allows the application to handle different languages and provide localized content
// Make sure to import this routing configuration in your application to enable i18n routing
