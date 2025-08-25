// src/ui/_home/page-ui.tsx
"use client";

import { useTranslations } from "next-intl";

export default function HomePageUI() {
  const t = useTranslations("_home");

  return (
    <>
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 hero-pattern">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {t.rich("title", {
                span: (chunks) => (
                  <span className="gradient-text">{chunks}</span>
                ),
              })}
            </h1>
            <p className="text-lg text-gray-400">{t("description")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
