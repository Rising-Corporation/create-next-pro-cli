// app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
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
    <html lang={locale} className="light" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d);}catch{document.documentElement.classList.add("light");}`,
          }}
        />
      </body>
    </html>
  );
}
