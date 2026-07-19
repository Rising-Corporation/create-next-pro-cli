export const GITHUB_REPOSITORY_URL =
  "https://github.com/Rising-Corporation/create-next-pro-cli";
export const GITHUB_README_URL = `${GITHUB_REPOSITORY_URL}#readme`;

const GITHUB_REPOSITORY_API_URL =
  "https://api.github.com/repos/Rising-Corporation/create-next-pro-cli";

export type GitHubRepositoryStats = {
  stars: number | null;
  watchers: number | null;
};

const unavailableStats: GitHubRepositoryStats = {
  stars: null,
  watchers: null,
};

type GitHubRepositoryFetcher = (
  url: string,
  init: {
    headers: Record<string, string>;
    next: { revalidate: number };
  },
) => Promise<Response>;

export function parseGitHubRepositoryStats(
  value: unknown,
): GitHubRepositoryStats {
  if (!value || typeof value !== "object") return unavailableStats;

  const repository = value as Record<string, unknown>;
  const stars = repository.stargazers_count;
  const watchers = repository.subscribers_count;

  if (
    !Number.isInteger(stars) ||
    (stars as number) < 0 ||
    !Number.isInteger(watchers) ||
    (watchers as number) < 0
  ) {
    return unavailableStats;
  }

  return {
    stars: stars as number,
    watchers: watchers as number,
  };
}

export async function getGitHubRepositoryStats(
  fetcher: GitHubRepositoryFetcher = fetch,
): Promise<GitHubRepositoryStats> {
  try {
    const response = await fetcher(GITHUB_REPOSITORY_API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return unavailableStats;

    return parseGitHubRepositoryStats(await response.json());
  } catch {
    return unavailableStats;
  }
}
