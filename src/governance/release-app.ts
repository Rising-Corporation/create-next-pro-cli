import { createSign, timingSafeEqual } from "node:crypto";

import type { GovernancePolicy } from "./model";

export type ReleaseAppErrorCode =
  | "PRECONDITION_FAILED"
  | "STATE_MISMATCH"
  | "REGISTRATION_TIMEOUT"
  | "MANIFEST_CONVERSION_FAILED"
  | "PARTIAL_CONFIGURATION"
  | "INSTALLATION_SCOPE_MISMATCH"
  | "ENV_CONFIGURATION_FAILED"
  | "SMOKE_FAILED";

export class ReleaseAppError extends Error {
  constructor(
    readonly code: ReleaseAppErrorCode,
    message: string,
    readonly exitCode: 1 | 2,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "ReleaseAppError";
  }
}

export type ReleaseAppManifest = {
  name: string;
  url: string;
  hook_attributes: { url: string; active: false };
  redirect_url: string;
  setup_url: string;
  public: false;
  default_permissions: { metadata: "read"; contents: "write" };
  default_events: [];
  request_oauth_on_install: false;
  setup_on_update: false;
};

export type ConvertedReleaseApp = {
  id: number;
  slug: string;
  owner: string;
  permissions: { metadata: "read"; contents: "write" };
  events: [];
  privateKey: string;
};

export type ReleaseAppInstallation = {
  id: number;
  appId: number;
  appSlug: string;
  owner: string;
  repositorySelection: "selected";
  permissions: { metadata: "read"; contents: "write" };
  events: [];
  repository: string;
};

export type ReleaseAppInstallationMetadata = Omit<
  ReleaseAppInstallation,
  "repository"
>;

export type ReleaseAppSetupSnapshot = {
  environmentExists: boolean;
  releaseEnabled?: string;
  appIdValue?: string;
  privateKeySecretPresent: boolean;
  installations: Array<{ appId: number; appSlug: string }>;
};

export type ReleaseAppSetupDecision =
  | { action: "create" }
  | { action: "resume-installation"; appId: number }
  | { action: "verify"; appId: number; installationId?: number };

export function releaseEnabledState(
  snapshot: ReleaseAppSetupSnapshot,
): boolean {
  if (
    snapshot.releaseEnabled !== "false" &&
    snapshot.releaseEnabled !== "true"
  ) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "RELEASE_ENABLED must be explicitly configured as true or false.",
      2,
    );
  }
  return snapshot.releaseEnabled === "true";
}

export function assertReleaseDisabled(snapshot: ReleaseAppSetupSnapshot): void {
  if (releaseEnabledState(snapshot)) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "RELEASE_ENABLED must remain false while provisioning or smoke-testing the release App.",
      2,
    );
  }
}

export type ReleaseAppCommandResult = {
  schemaVersion: 1;
  command: "setup" | "check" | "smoke";
  status: "configured" | "already-configured" | "incomplete" | "failed";
  exitCode: 0 | 1 | 2;
  repository: string;
  app: null | {
    id: number;
    slug: string;
    owner: string;
    installationId?: number;
  };
  environment: {
    name: string;
    appIdVariable: string;
    privateKeySecret: string;
    releaseEnabled: boolean | null;
  };
  smoke: null | { runId: number; url: string; conclusion: string };
  error: null | {
    code: ReleaseAppErrorCode;
    message: string;
    hint?: string;
  };
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ReleaseAppError(
      "MANIFEST_CONVERSION_FAILED",
      `GitHub returned an invalid ${field}.`,
      2,
    );
  }
  return value;
}

function requiredPositiveInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new ReleaseAppError(
      "MANIFEST_CONVERSION_FAILED",
      `GitHub returned an invalid ${field}.`,
      2,
    );
  }
  return Number(value);
}

function sortedEntries(value: unknown): Array<[string, string]> {
  return Object.entries(record(value))
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .sort(([left], [right]) => left.localeCompare(right));
}

function exactPermissions(
  value: unknown,
): value is { metadata: "read"; contents: "write" } {
  return (
    JSON.stringify(sortedEntries(value)) ===
    JSON.stringify([
      ["contents", "write"],
      ["metadata", "read"],
    ])
  );
}

function exactEvents(value: unknown): value is [] {
  return Array.isArray(value) && value.length === 0;
}

function releaseOwner(policy: GovernancePolicy): string {
  return policy.release.appOwner;
}

function repositoryName(policy: GovernancePolicy): string {
  const [owner, repository] = policy.repository.split("/");
  if (!owner || !repository || owner !== releaseOwner(policy)) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "The release App owner must match the repository owner.",
      2,
    );
  }
  return repository;
}

function assertLoopbackOrigin(origin: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "The manifest callback origin is invalid.",
      2,
    );
  }
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "The manifest callback must use an HTTP 127.0.0.1 origin.",
      2,
    );
  }
  return parsed;
}

export function buildReleaseAppManifest(
  policy: GovernancePolicy,
  origin: string,
  state: string,
): ReleaseAppManifest {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(state)) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "The manifest state must be an unguessable URL-safe value.",
      2,
    );
  }
  const callbackOrigin = assertLoopbackOrigin(origin);
  const callback = new URL("callback", callbackOrigin);
  const installed = new URL("installed", callbackOrigin);
  installed.searchParams.set("state", state);
  const homepage = `https://github.com/${policy.repository}`;
  return {
    name: policy.release.appName,
    url: homepage,
    hook_attributes: { url: homepage, active: policy.release.webhookActive },
    redirect_url: callback.toString(),
    setup_url: installed.toString(),
    public: policy.release.appPublic,
    default_permissions: { ...policy.release.permissions },
    default_events: [...policy.release.events] as [],
    request_oauth_on_install: false,
    setup_on_update: false,
  };
}

function equalState(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseLoopbackUrl(
  rawUrl: string,
  origin: string,
  pathname: string,
  expectedState: string,
): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, origin);
  } catch {
    throw new ReleaseAppError(
      "STATE_MISMATCH",
      "GitHub returned an invalid callback URL.",
      2,
    );
  }
  if (
    parsed.origin !== assertLoopbackOrigin(origin).origin ||
    parsed.pathname !== pathname ||
    !equalState(parsed.searchParams.get("state") ?? "", expectedState)
  ) {
    throw new ReleaseAppError(
      "STATE_MISMATCH",
      "The GitHub callback state or destination did not match this setup run.",
      2,
    );
  }
  return parsed;
}

export function parseRegistrationCallback(
  rawUrl: string,
  origin: string,
  expectedState: string,
): string {
  const parsed = parseLoopbackUrl(rawUrl, origin, "/callback", expectedState);
  const code = parsed.searchParams.get("code") ?? "";
  if (!/^[A-Za-z0-9_-]{20,256}$/.test(code)) {
    throw new ReleaseAppError(
      "MANIFEST_CONVERSION_FAILED",
      "GitHub did not return a valid App Manifest conversion code.",
      2,
    );
  }
  return code;
}

export function parseInstallationCallback(
  rawUrl: string,
  origin: string,
  expectedState: string,
): number {
  const parsed = parseLoopbackUrl(rawUrl, origin, "/installed", expectedState);
  const installationId = Number(parsed.searchParams.get("installation_id"));
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    throw new ReleaseAppError(
      "INSTALLATION_SCOPE_MISMATCH",
      "GitHub did not return a valid installation identifier.",
      1,
    );
  }
  return installationId;
}

export function validateManifestConversion(
  value: unknown,
  policy: GovernancePolicy,
): ConvertedReleaseApp {
  const candidate = record(value);
  const owner = requiredString(record(candidate.owner).login, "App owner");
  const slug = requiredString(candidate.slug, "App slug");
  const privateKey = requiredString(candidate.pem, "private key");
  const id = requiredPositiveInteger(candidate.id, "App ID");
  if (
    owner !== releaseOwner(policy) ||
    slug !== policy.release.appSlug ||
    !exactPermissions(candidate.permissions) ||
    !exactEvents(candidate.events) ||
    !/^-----BEGIN (?:RSA )?PRIVATE KEY-----\n[\s\S]+\n-----END (?:RSA )?PRIVATE KEY-----\n?$/.test(
      privateKey,
    )
  ) {
    throw new ReleaseAppError(
      "MANIFEST_CONVERSION_FAILED",
      "The created GitHub App does not match the governed release App contract.",
      2,
      "Delete the incomplete App in GitHub and restart setup after reviewing the manifest.",
    );
  }
  return {
    id,
    slug,
    owner,
    permissions: { metadata: "read", contents: "write" },
    events: [],
    privateKey,
  };
}

export function validateAuthenticatedApp(
  value: unknown,
  policy: GovernancePolicy,
  expectedId: number,
): Omit<ConvertedReleaseApp, "privateKey"> {
  const candidate = record(value);
  const owner = requiredString(record(candidate.owner).login, "App owner");
  const id = requiredPositiveInteger(candidate.id, "App ID");
  const slug = requiredString(candidate.slug, "App slug");
  if (
    id !== expectedId ||
    owner !== releaseOwner(policy) ||
    slug !== policy.release.appSlug ||
    !exactPermissions(candidate.permissions) ||
    !exactEvents(candidate.events)
  ) {
    throw new ReleaseAppError(
      "MANIFEST_CONVERSION_FAILED",
      "The authenticated GitHub App identity or permissions are inconsistent.",
      2,
    );
  }
  return {
    id,
    slug,
    owner,
    permissions: { metadata: "read", contents: "write" },
    events: [],
  };
}

export function validateReleaseAppInstallationMetadata(
  installationValue: unknown,
  policy: GovernancePolicy,
  expectedAppId: number,
): ReleaseAppInstallationMetadata {
  const installation = record(installationValue);
  const id = requiredPositiveInteger(installation.id, "installation ID");
  const appId = requiredPositiveInteger(
    installation.app_id,
    "installation App ID",
  );
  const appSlug = requiredString(
    installation.app_slug,
    "installation App slug",
  );
  const owner = requiredString(
    record(installation.account).login,
    "installation owner",
  );
  if (
    appId !== expectedAppId ||
    appSlug !== policy.release.appSlug ||
    owner !== releaseOwner(policy) ||
    installation.target_type !== "Organization" ||
    installation.repository_selection !== "selected" ||
    !exactPermissions(installation.permissions) ||
    !exactEvents(installation.events)
  ) {
    throw new ReleaseAppError(
      "INSTALLATION_SCOPE_MISMATCH",
      "The release App installation must target the governed organization with selected repositories and the exact permissions.",
      1,
      `Edit the ${policy.release.appSlug} installation and select only ${repositoryName(policy)}.`,
    );
  }
  return {
    id,
    appId,
    appSlug,
    owner,
    repositorySelection: "selected",
    permissions: { metadata: "read", contents: "write" },
    events: [],
  };
}

export function validateReleaseAppInstallation(
  installationValue: unknown,
  repositoriesValue: unknown,
  policy: GovernancePolicy,
  expectedAppId: number,
): ReleaseAppInstallation {
  const installation = validateReleaseAppInstallationMetadata(
    installationValue,
    policy,
    expectedAppId,
  );
  const repositories = record(repositoriesValue);
  const repositoryItems = Array.isArray(repositories.repositories)
    ? repositories.repositories
    : [];
  const repository =
    repositoryItems.length === 1
      ? requiredString(record(repositoryItems[0]).full_name, "repository name")
      : "";
  if (
    repositories.total_count !== 1 ||
    repositoryItems.length !== 1 ||
    repository !== policy.repository
  ) {
    throw new ReleaseAppError(
      "INSTALLATION_SCOPE_MISMATCH",
      "The release App installation must target only the governed repository with the exact permissions.",
      1,
      `Edit the ${policy.release.appSlug} installation and select only ${repositoryName(policy)}.`,
    );
  }
  return { ...installation, repository };
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export function createReleaseAppJwt(
  appId: number,
  privateKey: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "The release App ID must be a positive integer.",
      2,
    );
  }
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: appId }),
  );
  const data = `${header}.${payload}`;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(data);
    signer.end();
    return `${data}.${signer.sign(privateKey).toString("base64url")}`;
  } catch {
    throw new ReleaseAppError(
      "MANIFEST_CONVERSION_FAILED",
      "GitHub returned a private key that could not authenticate the release App.",
      2,
    );
  }
}

export function buildReleaseAppInstallationUrl(
  policy: GovernancePolicy,
  organizationId: number,
  repositoryId: number,
): string {
  if (
    !Number.isSafeInteger(organizationId) ||
    organizationId <= 0 ||
    !Number.isSafeInteger(repositoryId) ||
    repositoryId <= 0
  ) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "The organization and repository identifiers must be positive integers.",
      2,
    );
  }
  const url = new URL(
    `https://github.com/apps/${policy.release.appSlug}/installations/new/permissions`,
  );
  url.searchParams.set("suggested_target_id", String(organizationId));
  url.searchParams.set("repository_ids[]", String(repositoryId));
  return url.toString();
}

export function decideReleaseAppSetup(
  snapshot: ReleaseAppSetupSnapshot,
  policy: GovernancePolicy,
): ReleaseAppSetupDecision {
  if (!snapshot.environmentExists) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      `The ${policy.environment.name} environment does not exist.`,
      2,
    );
  }
  const matching = snapshot.installations.filter(
    (installation) => installation.appSlug === policy.release.appSlug,
  );
  if (matching.length > 1) {
    throw new ReleaseAppError(
      "PARTIAL_CONFIGURATION",
      "Multiple installations use the governed release App slug.",
      2,
    );
  }
  const hasVariable = snapshot.appIdValue !== undefined;
  const hasSecret = snapshot.privateKeySecretPresent;
  if (hasVariable !== hasSecret) {
    throw new ReleaseAppError(
      "PARTIAL_CONFIGURATION",
      "The release App ID variable and private-key secret must either both exist or both be absent.",
      2,
    );
  }
  if (!hasVariable && !hasSecret) {
    if (matching.length > 0) {
      throw new ReleaseAppError(
        "PARTIAL_CONFIGURATION",
        "The release App is installed but its environment credentials are missing.",
        2,
        "Generate a new private key in GitHub or remove the incomplete App before restarting setup.",
      );
    }
    return { action: "create" };
  }
  const appId = Number(snapshot.appIdValue);
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    throw new ReleaseAppError(
      "PARTIAL_CONFIGURATION",
      `${policy.release.appIdVariable} is not a valid GitHub App ID.`,
      2,
    );
  }
  const installation = matching[0];
  if (!installation) return { action: "resume-installation", appId };
  if (installation.appId !== appId) {
    throw new ReleaseAppError(
      "PARTIAL_CONFIGURATION",
      `${policy.release.appIdVariable} does not match the installed release App.`,
      2,
    );
  }
  return { action: "verify", appId };
}

export function safeReleaseAppResult(
  policy: GovernancePolicy,
  command: ReleaseAppCommandResult["command"],
  overrides: Partial<ReleaseAppCommandResult> = {},
): ReleaseAppCommandResult {
  return {
    schemaVersion: 1,
    command,
    status: "failed",
    exitCode: 2,
    repository: policy.repository,
    app: null,
    environment: {
      name: policy.environment.name,
      appIdVariable: policy.release.appIdVariable,
      privateKeySecret: policy.release.privateKeySecret,
      releaseEnabled: null,
    },
    smoke: null,
    error: null,
    ...overrides,
  };
}
