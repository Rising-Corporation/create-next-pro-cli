import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("_global_ui.not_found");
  return (
    <main>
      <h2>{t("title")}</h2>
      <p>{t("description")}</p>
      <Link href="/">{t("home")}</Link>
    </main>
  );
}
