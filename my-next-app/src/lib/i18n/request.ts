// lib/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  //console.log("Requesting locale... :", requestLocale);
  // Typically corresponds to the `[locale]` segment
  //console.log("Routing :", routing);
  const requested = await requestLocale;
  //console.log(`Requested locale: "${requested}"`);
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  //console.log(`Locale requested: "${locale}"`);

  return {
    locale,
    messages: (await import(`@/../messages/${locale}.ts`)).default,
  };
});

// This file is used to configure internationalization (i18n) for the Next.js application
// It imports the getRequestConfig function from next-intl/server to set up locale-specific messages
// The messages are loaded dynamically based on the requested locale
// The locales and defaultLocale are imported from the routing module
// This allows the application to support multiple languages, such as English and French
// The messages are expected to be in JSON format and located in the messages directory
// This setup is essential for providing localized content to users based on their language preferences
// Make sure to create the necessary message files for each locale in the specified directory
