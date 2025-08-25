"use client"; // DO NOT FORGET , this is a client component.
import { useTranslations } from "next-intl";

const Loading = () => {
  const t = useTranslations("_global_ui");
  return (
    <div className="rounded border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-2">{t("Loading.title")}</h2>
      <p className="text-gray-600">{t("Loading.description")}</p>
    </div>
  );
};
export default Loading;
