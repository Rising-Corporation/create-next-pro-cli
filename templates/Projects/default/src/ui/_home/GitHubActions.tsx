import { Eye, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/ui/_global/Button";
import {
  GITHUB_REPOSITORY_URL,
  getGitHubRepositoryStats,
} from "@/lib/github/repository";

export default async function GitHubActions() {
  const [t, stats] = await Promise.all([
    getTranslations("_home.github"),
    getGitHubRepositoryStats(),
  ]);

  const actions = [
    {
      label: t("star"),
      count: stats.stars,
      icon: Star,
    },
    {
      label: t("watch"),
      count: stats.watchers,
      icon: Eye,
    },
  ];

  return (
    <div className="mt-12 text-center">
      <p className="mb-4">{t("project_credit")}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {actions.map(({ label, count, icon: Icon }) => (
          <Button key={label} asChild variant="outline">
            <a
              href={GITHUB_REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={
                count === null
                  ? label
                  : t("action_with_count", { label, count })
              }
            >
              <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
              {count !== null && (
                <span className="ml-2 border-l border-current pl-2 tabular-nums">
                  {count}
                </span>
              )}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
