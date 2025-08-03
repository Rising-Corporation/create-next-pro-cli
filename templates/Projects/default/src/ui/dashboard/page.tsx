("");
import { useTranslations } from "next-intl";
import BackButton from "@/ui/_global/BackButton";
import WelcomeCard from "@/ui/dashboard/WelcomeCard";
import StatsCard from "@/ui/dashboard/StatsCard";

export default function Dashboard() {
  const t = useTranslations("dashboard");
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <BackButton />
      </div>
      <p className="text-muted mb-8">{t("description")}</p>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WelcomeCard t={t} />
        <StatsCard t={t} />
      </section>
    </>
  );
}
