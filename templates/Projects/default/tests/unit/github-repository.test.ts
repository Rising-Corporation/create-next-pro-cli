import { describe, expect, test } from "vitest";
import {
  getGitHubRepositoryStats,
  parseGitHubRepositoryStats,
} from "@/lib/github/repository";

describe("GitHub repository statistics", () => {
  test("maps stars and actual watchers from the repository response", () => {
    expect(
      parseGitHubRepositoryStats({
        stargazers_count: 12,
        watchers_count: 12,
        subscribers_count: 4,
      }),
    ).toEqual({ stars: 12, watchers: 4 });
  });

  test.each([
    null,
    {},
    { stargazers_count: -1, subscribers_count: 2 },
    { stargazers_count: 1, subscribers_count: "2" },
  ])("rejects invalid repository statistics", (value) => {
    expect(parseGitHubRepositoryStats(value)).toEqual({
      stars: null,
      watchers: null,
    });
  });

  test("falls back when GitHub returns an error response", async () => {
    const stats = await getGitHubRepositoryStats(
      async () => new Response(null, { status: 403 }),
    );

    expect(stats).toEqual({ stars: null, watchers: null });
  });

  test("falls back when the GitHub request fails", async () => {
    const stats = await getGitHubRepositoryStats(async () => {
      throw new Error("network unavailable");
    });

    expect(stats).toEqual({ stars: null, watchers: null });
  });
});
