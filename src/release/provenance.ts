import { Buffer } from "node:buffer";

type JsonObject = Record<string, unknown>;

export type ProvenanceExpectation = {
  packageName: string;
  version: string;
  sourceSha: string;
  repository: string;
  workflowPath: string;
  ref: string;
  runId: string;
};

export type VerifiedProvenance = {
  packageName: string;
  version: string;
  sourceSha: string;
  workflow: string;
  invocationId: string;
  integrity: string;
};

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function equals(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label} mismatch: expected ${expected}, received ${actual}`,
    );
  }
}

export function verifyNpmProvenance(
  metadataValue: unknown,
  attestationsValue: unknown,
  expected: ProvenanceExpectation,
): VerifiedProvenance {
  const metadata = object(metadataValue, "npm metadata");
  equals(
    string(metadata.name, "package name"),
    expected.packageName,
    "package name",
  );
  equals(
    string(metadata.version, "package version"),
    expected.version,
    "package version",
  );

  const dist = object(metadata.dist, "npm dist metadata");
  const integrity = string(dist.integrity, "npm dist integrity");
  const [algorithm, encodedDigest] = integrity.split("-", 2);
  equals(algorithm ?? "", "sha512", "integrity algorithm");
  if (!encodedDigest) throw new Error("npm dist integrity has no digest");
  const integrityHex = Buffer.from(encodedDigest, "base64").toString("hex");

  const attestations = object(attestationsValue, "npm attestations");
  const provenanceEntry = array(
    attestations.attestations,
    "npm attestations",
  ).find(
    (entry) =>
      object(entry, "npm attestation").predicateType ===
      "https://slsa.dev/provenance/v1",
  );
  if (!provenanceEntry) throw new Error("npm SLSA provenance is missing");

  const bundle = object(
    object(provenanceEntry, "npm provenance").bundle,
    "bundle",
  );
  const envelope = object(bundle.dsseEnvelope, "DSSE envelope");
  const payload = JSON.parse(
    Buffer.from(string(envelope.payload, "DSSE payload"), "base64url").toString(
      "utf8",
    ),
  ) as unknown;
  const statement = object(payload, "provenance statement");
  equals(
    string(statement.predicateType, "provenance predicate type"),
    "https://slsa.dev/provenance/v1",
    "provenance predicate type",
  );

  const expectedSubject = `pkg:npm/${expected.packageName}@${expected.version}`;
  const subject = array(statement.subject, "provenance subjects")
    .map((entry) => object(entry, "provenance subject"))
    .find((entry) => entry.name === expectedSubject);
  if (!subject)
    throw new Error(`provenance subject ${expectedSubject} is missing`);
  equals(
    string(object(subject.digest, "subject digest").sha512, "subject sha512"),
    integrityHex,
    "provenance subject digest",
  );

  const predicate = object(statement.predicate, "provenance predicate");
  const buildDefinition = object(
    predicate.buildDefinition,
    "provenance build definition",
  );
  const workflow = object(
    object(buildDefinition.externalParameters, "external parameters").workflow,
    "workflow parameters",
  );
  equals(
    string(workflow.repository, "workflow repository"),
    expected.repository,
    "workflow repository",
  );
  equals(
    string(workflow.path, "workflow path"),
    expected.workflowPath,
    "workflow path",
  );
  equals(string(workflow.ref, "workflow ref"), expected.ref, "workflow ref");

  const dependency = array(
    buildDefinition.resolvedDependencies,
    "resolved dependencies",
  )
    .map((entry) => object(entry, "resolved dependency"))
    .find((entry) =>
      string(entry.uri, "resolved dependency URI").startsWith(
        `git+${expected.repository}@`,
      ),
    );
  if (!dependency) throw new Error("GitHub source dependency is missing");
  const sourceSha = string(
    object(dependency.digest, "source digest").gitCommit,
    "source commit",
  );
  equals(sourceSha, expected.sourceSha, "source commit");

  const runDetails = object(predicate.runDetails, "provenance run details");
  const invocationId = string(
    object(runDetails.metadata, "run metadata").invocationId,
    "workflow invocation",
  );
  const expectedInvocation = `${expected.repository}/actions/runs/${expected.runId}/`;
  if (!invocationId.startsWith(expectedInvocation)) {
    throw new Error(
      `workflow invocation mismatch: expected prefix ${expectedInvocation}, received ${invocationId}`,
    );
  }

  return {
    packageName: expected.packageName,
    version: expected.version,
    sourceSha,
    workflow: `${workflow.path}@${workflow.ref}`,
    invocationId,
    integrity,
  };
}
