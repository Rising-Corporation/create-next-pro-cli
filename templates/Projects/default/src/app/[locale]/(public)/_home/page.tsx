"use client";
import { useTranslations } from "next-intl";
// import Test from "@/ui/_home/test/page";

export default function HomePage() {
  const t = useTranslations("_home");
  return (
    <main className="py-8 px-4 max-w-3xl mx-auto">
      {/*  <Test /> */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <p className="text-muted mt-2">{t("description")}</p>
    </main>
  );
}
