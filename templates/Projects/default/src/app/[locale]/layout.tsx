// app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import "@/app/styles/globals.css";
import { routing } from "@/lib/i18n/routing";
import { getMessages } from "@/lib/i18n/messages";

export const metadata: Metadata = {
  title: {
    default: "Create Next Pro",
    template: "%s | Create Next Pro",
  },
  description: "A Bun-first Next.js template for create-next-pro-cli.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = getMessages(locale);
  return (
    <html lang={locale} className="light">
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
