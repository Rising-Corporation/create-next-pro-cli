// src/ui/dashboard/page-ui.tsx
import { getTranslations } from "next-intl/server";
import WelcomeCard from "@/ui/dashboard/WelcomeCard";
import StatsCard from "@/ui/dashboard/StatsCard";

export default async function Dashboard() {
  const t = await getTranslations("dashboard");
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <p className="mb-8">{t("description")}</p>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WelcomeCard t={t} />
        <StatsCard t={t} />
      </section>
    </>
  );
}
