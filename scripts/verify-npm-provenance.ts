import process from "node:process";

import { verifyNpmProvenance } from "../src/release/provenance";

const [packageName, version, sourceSha, runId] = process.argv.slice(2);
if (!packageName || !version || !sourceSha || !runId) {
  throw new Error(
    "usage: verify-npm-provenance <package> <version> <source-sha> <run-id>",
  );
}

const metadataUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
const metadataResponse = await fetch(metadataUrl);
if (!metadataResponse.ok) {
  throw new Error(
    `npm metadata request failed with ${metadataResponse.status}`,
  );
}
const metadata = (await metadataResponse.json()) as {
  dist?: { attestations?: { url?: string } };
};
const attestationsUrl = metadata.dist?.attestations?.url;
if (!attestationsUrl) throw new Error("npm attestation URL is missing");

const attestationsResponse = await fetch(attestationsUrl);
if (!attestationsResponse.ok) {
  throw new Error(
    `npm attestations request failed with ${attestationsResponse.status}`,
  );
}

const result = verifyNpmProvenance(
  metadata,
  await attestationsResponse.json(),
  {
    packageName,
    version,
    sourceSha,
    repository: "https://github.com/Rising-Corporation/create-next-pro-cli",
    workflowPath: ".github/workflows/ci.yml",
    ref: "refs/heads/master",
    runId,
  },
);
process.stdout.write(`${JSON.stringify(result)}\n`);
