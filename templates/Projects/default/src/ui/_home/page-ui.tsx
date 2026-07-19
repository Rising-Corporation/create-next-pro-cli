// src/ui/_home/page-ui.tsx
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { GITHUB_README_URL } from "@/lib/github/repository";
import GitHubActions from "@/ui/_home/GitHubActions";

export default async function HomePageUI() {
  const t = await getTranslations("_home");

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            {t.rich("title", {
              span: (chunks) => <span className="gradient-text">{chunks}</span>,
            })}
          </h1>
          <div>
            <p className="text-lg">{t("description")}</p>
            <a
              href={GITHUB_README_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 font-medium underline underline-offset-4 hover:text-stone-600"
            >
              {t("readme")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
        <GitHubActions />
      </div>
    </section>
  );
}
