"use client";
import { useTranslations } from "next-intl";
import BackButton from "@/ui/_global/BackButton";

export default function template() {
  const t = useTranslations("template");
  return (
    <section className="px-4 pb-8 pt-24 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <BackButton />
      </div>
      <p className="text-muted-foreground mb-8">{t("description")}</p>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6"></section>
    </section>
  );
}
