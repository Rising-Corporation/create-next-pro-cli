"use client"; // DO NOT FORGET , this is a client component.
import { useTranslations } from "next-intl";

const Component = () => {
  const t = useTranslations("componentPage");
  return (
    <div className="rounded border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-2">{t("Component.title")}</h2>
      <p className="text-gray-600">{t("Component.description")}</p>
    </div>
  );
};
export default Component;
