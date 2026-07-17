import { describe, expect, test } from "vitest";

import { decideRelease, parseStableVersion } from "./model";

const base = {
  currentVersion: "0.1.26",
  npmVersion: "0.1.26",
  headSha: "head",
  sourceSha: "head",
  headMessage: "feat(cli): add release safety",
};

describe("release state machine", () => {
  test("selects the next patch for a validated master change", () => {
    expect(decideRelease(base)).toMatchObject({
      action: "release",
      targetVersion: "0.1.27",
    });
  });

  test("resumes a reserved patch missing from npm", () => {
    expect(
      decideRelease({
        ...base,
        currentVersion: "0.1.27",
        tagSha: "head",
        headMessage: "chore(release): v0.1.27",
      }),
    ).toMatchObject({ action: "resume", targetVersion: "0.1.27" });
  });

  test("skips a superseded workflow run", () => {
    expect(decideRelease({ ...base, sourceSha: "older" }).action).toBe("skip");
  });

  test("skips an already published release commit", () => {
    expect(
      decideRelease({
        ...base,
        headMessage: "chore(release): v0.1.26",
      }).action,
    ).toBe("skip");
  });

  test("rejects npm ahead of Git", () => {
    expect(decideRelease({ ...base, currentVersion: "0.1.25" }).action).toBe(
      "error",
    );
  });

  test("rejects an untagged or multi-patch pending version", () => {
    expect(decideRelease({ ...base, currentVersion: "0.1.28" }).action).toBe(
      "error",
    );
    expect(decideRelease({ ...base, currentVersion: "0.1.27" }).action).toBe(
      "error",
    );
  });

  test("rejects prereleases and malformed versions", () => {
    expect(parseStableVersion("1.0.0-rc.1")).toBeUndefined();
    expect(parseStableVersion("v1.0.0")).toBeUndefined();
    expect(decideRelease({ ...base, npmVersion: "0.1.27-beta.1" }).action).toBe(
      "error",
    );
  });
});
