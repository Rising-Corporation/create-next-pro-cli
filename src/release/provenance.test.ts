import { createHash } from "node:crypto";

import { describe, expect, test } from "vitest";

import { verifyNpmProvenance } from "./provenance";

const archive = Buffer.from("release archive");
const sha512 = createHash("sha512").update(archive).digest("hex");
const integrity = `sha512-${createHash("sha512").update(archive).digest("base64")}`;
const expectation = {
  packageName: "create-next-pro-cli",
  version: "0.1.27",
  sourceSha: "source-sha",
  repository: "https://github.com/Rising-Corporation/create-next-pro-cli",
  workflowPath: ".github/workflows/ci.yml",
  ref: "refs/heads/master",
  runId: "12345",
};

function fixtures(sourceSha = expectation.sourceSha) {
  const statement = {
    predicateType: "https://slsa.dev/provenance/v1",
    subject: [
      {
        name: "pkg:npm/create-next-pro-cli@0.1.27",
        digest: { sha512 },
      },
    ],
    predicate: {
      buildDefinition: {
        externalParameters: {
          workflow: {
            repository: expectation.repository,
            path: expectation.workflowPath,
            ref: expectation.ref,
          },
        },
        resolvedDependencies: [
          {
            uri: `git+${expectation.repository}@${expectation.ref}`,
            digest: { gitCommit: sourceSha },
          },
        ],
      },
      runDetails: {
        metadata: {
          invocationId: `${expectation.repository}/actions/runs/${expectation.runId}/attempts/1`,
        },
      },
    },
  };
  return {
    metadata: {
      name: expectation.packageName,
      version: expectation.version,
      dist: { integrity },
    },
    attestations: {
      attestations: [
        {
          predicateType: "https://slsa.dev/provenance/v1",
          bundle: {
            dsseEnvelope: {
              payload: Buffer.from(JSON.stringify(statement)).toString(
                "base64url",
              ),
            },
          },
        },
      ],
    },
  };
}

describe("npm trusted-publishing provenance", () => {
  test("binds the published archive to the expected workflow source", () => {
    const { metadata, attestations } = fixtures();
    expect(
      verifyNpmProvenance(metadata, attestations, expectation),
    ).toMatchObject({
      packageName: "create-next-pro-cli",
      version: "0.1.27",
      sourceSha: "source-sha",
    });
  });

  test("rejects provenance from a different source commit", () => {
    const { metadata, attestations } = fixtures("unexpected-sha");
    expect(() =>
      verifyNpmProvenance(metadata, attestations, expectation),
    ).toThrow("source commit mismatch");
  });
});
