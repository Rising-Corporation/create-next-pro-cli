// app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import React from "react";
import "@/app/styles/globals.css"; // Import global styles
import GlobalHeader from "@/ui/_global/GlobalHeader";
import GlobalMain from "@/ui/_global/GlobalMain";
import { isConnected } from "@/lib/auth/isConnected";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isConnectedInitial = await isConnected();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <GlobalHeader isConnectedInitial={isConnectedInitial} />
          <GlobalMain>{children}</GlobalMain>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
