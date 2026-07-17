// src/ui/_home/page-ui.tsx
import { getTranslations } from "next-intl/server";

export default async function HomePageUI() {
  const t = await getTranslations("_home");

  return (
    <>
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {t.rich("title", {
                span: (chunks) => (
                  <span className="gradient-text">{chunks}</span>
                ),
              })}
            </h1>
            <p className="text-lg">{t("description")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
