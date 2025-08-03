"use client";
import { useTranslations } from "next-intl";
import BackButton from "@/ui/_global/BackButton";

export default function templatePage() {
  const t = useTranslations("template");
  return (
    <main className="py-8 px-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <BackButton />
      </div>
      <p className="text-muted mb-8">{t("description")}</p>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6"></section>
    </main>
  );
}
// This page is the main entry point for the page
// It uses the `useTranslations` hook to fetch localized strings
// The `t` function is used to get the translated strings for the page
// You can add more components or logic here to build your page
// This is part of the Next.js app directory structure
// It will be automatically rendered when the user navigates to the page
// Make sure to define the translations in your locale files
