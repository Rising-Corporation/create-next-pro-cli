import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import {
  assertGovernancePolicy,
  type GovernancePolicy,
} from "../src/governance/model";
import {
  buildReleaseAppInstallationUrl,
  buildReleaseAppManifest,
  createReleaseAppJwt,
  decideReleaseAppSetup,
  parseInstallationCallback,
  parseRegistrationCallback,
  type ConvertedReleaseApp,
  type ReleaseAppCommandResult,
  ReleaseAppError,
  safeReleaseAppResult,
  validateAuthenticatedApp,
  validateManifestConversion,
  validateReleaseAppInstallation,
  validateReleaseAppInstallationMetadata,
  type ReleaseAppInstallation,
  type ReleaseAppInstallationMetadata,
  type ReleaseAppManifest,
  type ReleaseAppSetupSnapshot,
} from "../src/governance/release-app";

const POLICY_PATH = ".github/governance/policy.json";
const WORKFLOW = "release-app-smoke.yml";
const INTERACTIVE_TIMEOUT_MS = 15 * 60 * 1000;
const API_VERSION = "2022-11-28";

type JsonRecord = Record<string, unknown>;

export type ProcessRunner = (
  command: string,
  args: string[],
  options?: { input?: string; timeoutMs?: number },
) => string;

type RemoteSnapshot = ReleaseAppSetupSnapshot & {
  environmentSecretNames: string[];
  installationValues: unknown[];
  organizationId: number;
  repositoryId: number;
  repository: {
    nameWithOwner: string;
    isFork: boolean;
    viewerPermission: string;
  };
  membership: { state: string; role: string };
};

type SmokeRun = {
  databaseId: number;
  status: string;
  conclusion: string;
  url: string;
  displayTitle: string;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
};

function deferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (error: unknown) => void;
  const promise = new Promise<T>((resolveValue, rejectValue) => {
    resolvePromise = resolveValue;
    rejectPromise = rejectValue;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function positiveInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : undefined;
}

function defaultRunner(
  command: string,
  args: string[],
  options: { input?: string; timeoutMs?: number } = {},
): string {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      input: options.input,
      timeout: options.timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      `${command} ${args.slice(0, 2).join(" ")} failed.`,
      2,
      "Verify local authentication and inspect the command directly without exposing credentials.",
    );
  }
}

function parseJson(output: string, label: string): unknown {
  try {
    return output ? (JSON.parse(output) as unknown) : {};
  } catch {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      `${label} returned invalid JSON.`,
      2,
    );
  }
}

function ghJson(runner: ProcessRunner, args: string[], label: string): unknown {
  return parseJson(runner("gh", args), label);
}

function ghApi(
  runner: ProcessRunner,
  endpoint: string,
  method = "GET",
): unknown {
  return ghJson(
    runner,
    [
      "api",
      endpoint,
      "--method",
      method,
      "--header",
      `X-GitHub-Api-Version: ${API_VERSION}`,
    ],
    `GitHub API ${endpoint}`,
  );
}

function tryGhApi(
  runner: ProcessRunner,
  endpoint: string,
): unknown | undefined {
  try {
    return ghApi(runner, endpoint);
  } catch {
    return undefined;
  }
}

function readPolicy(): GovernancePolicy {
  return assertGovernancePolicy(
    JSON.parse(readFileSync(POLICY_PATH, "utf8")) as unknown,
  );
}

function argumentValue(name: string): string | undefined {
  const args = process.argv.slice(3);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasArgument(name: string): boolean {
  return process.argv.slice(3).includes(name);
}

function releaseEnabledValue(value: unknown): string | undefined {
  return (
    string(
      array(record(value).variables)
        .map(record)
        .find((variable) => variable.name === "RELEASE_ENABLED")?.value,
    ) || undefined
  );
}

function installationIdentity(value: unknown): {
  appId: number;
  appSlug: string;
} {
  const candidate = record(value);
  return {
    appId: positiveInteger(candidate.app_id) ?? 0,
    appSlug: string(candidate.app_slug),
  };
}

function collectRemoteSnapshot(
  policy: GovernancePolicy,
  runner: ProcessRunner,
): RemoteSnapshot {
  const repository = ghJson(
    runner,
    [
      "repo",
      "view",
      policy.repository,
      "--json",
      "nameWithOwner,isFork,viewerPermission,id",
    ],
    "GitHub repository",
  );
  const repositoryRecord = record(repository);
  const membership = record(
    ghApi(runner, `user/memberships/orgs/${policy.release.appOwner}`),
  );
  const organization = record(ghApi(runner, `orgs/${policy.release.appOwner}`));
  const repositoryApi = record(ghApi(runner, `repos/${policy.repository}`));
  const environment = tryGhApi(
    runner,
    `repos/${policy.repository}/environments/${policy.environment.name}`,
  );
  const environmentVariables = record(
    tryGhApi(
      runner,
      `repos/${policy.repository}/environments/${policy.environment.name}/variables?per_page=100`,
    ),
  );
  const environmentSecrets = record(
    tryGhApi(
      runner,
      `repos/${policy.repository}/environments/${policy.environment.name}/secrets?per_page=100`,
    ),
  );
  const repositoryVariables = ghApi(
    runner,
    `repos/${policy.repository}/actions/variables?per_page=100`,
  );
  const installations = record(
    ghApi(runner, `orgs/${policy.release.appOwner}/installations?per_page=100`),
  );
  const environmentVariableEntries = array(environmentVariables.variables).map(
    record,
  );
  const environmentSecretNames = array(environmentSecrets.secrets).map((item) =>
    string(record(item).name),
  );
  const installationValues = array(installations.installations);
  return {
    environmentExists: environment !== undefined,
    releaseEnabled: releaseEnabledValue(repositoryVariables),
    appIdValue:
      string(
        environmentVariableEntries.find(
          (variable) => variable.name === policy.release.appIdVariable,
        )?.value,
      ) || undefined,
    privateKeySecretPresent: environmentSecretNames.includes(
      policy.release.privateKeySecret,
    ),
    installations: installationValues.map(installationIdentity),
    environmentSecretNames,
    installationValues,
    organizationId: positiveInteger(organization.id) ?? 0,
    repositoryId: positiveInteger(repositoryApi.id) ?? 0,
    repository: {
      nameWithOwner: string(repositoryRecord.nameWithOwner),
      isFork: repositoryRecord.isFork === true,
      viewerPermission: string(repositoryRecord.viewerPermission),
    },
    membership: {
      state: string(membership.state),
      role: string(membership.role),
    },
  };
}

function assertRepositoryAccess(
  policy: GovernancePolicy,
  snapshot: RemoteSnapshot,
): void {
  if (
    snapshot.repository.nameWithOwner !== policy.repository ||
    snapshot.repository.isFork ||
    snapshot.repository.viewerPermission !== "ADMIN" ||
    snapshot.membership.state !== "active" ||
    snapshot.membership.role !== "admin" ||
    snapshot.organizationId <= 0 ||
    snapshot.repositoryId <= 0
  ) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "Release App setup requires an active organization owner on the exact non-fork repository.",
      2,
    );
  }
}

function assertSetupPreconditions(
  policy: GovernancePolicy,
  snapshot: RemoteSnapshot,
  runner: ProcessRunner,
): void {
  if (process.env.CI) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "Release App setup is disabled in CI.",
      2,
    );
  }
  if (argumentValue("--confirm") !== policy.repository) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      `Setup requires --confirm ${policy.repository}.`,
      2,
    );
  }
  if (runner("git", ["status", "--porcelain"])) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "Release App setup requires a clean worktree.",
      2,
    );
  }
  const branch = runner("git", ["branch", "--show-current"]);
  const head = runner("git", ["rev-parse", "HEAD"]);
  const remoteHead = runner("git", ["rev-parse", "origin/master"]);
  if (
    branch !== policy.repositorySettings.defaultBranch ||
    head !== remoteHead
  ) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "Release App setup must run from master synchronized with origin/master.",
      2,
    );
  }
  assertRepositoryAccess(policy, snapshot);
}

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildManifestPage(
  policy: GovernancePolicy,
  manifest: ReleaseAppManifest,
  state: string,
): string {
  const action = new URL(
    `https://github.com/organizations/${encodeURIComponent(policy.release.appOwner)}/settings/apps/new`,
  );
  action.searchParams.set("state", state);
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Register release App</title></head>
  <body>
    <p>Redirecting to GitHub to review the governed release App manifest.</p>
    <form id="manifest" action="${html(action.toString())}" method="post">
      <input type="hidden" name="manifest" value="${html(JSON.stringify(manifest))}">
      <button type="submit">Continue to GitHub</button>
    </form>
    <script>document.getElementById("manifest").submit();</script>
  </body>
</html>`;
}

class LoopbackServer {
  private readonly registration = deferred<string>();
  private readonly installation = deferred<number>();
  private manifestPage = "";
  private originValue = "";

  private constructor(
    private readonly server: Server,
    private readonly state: string,
  ) {}

  static async start(state: string): Promise<LoopbackServer> {
    const holder: { instance?: LoopbackServer } = {};
    const server = createServer((request, response) => {
      holder.instance?.handle(
        request.method ?? "",
        request.url ?? "",
        request.headers.host,
        response,
      );
    });
    const instance = new LoopbackServer(server, state);
    holder.instance = instance;
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(0, "127.0.0.1", () => resolveListen());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new ReleaseAppError(
        "PRECONDITION_FAILED",
        "The loopback manifest server could not determine its port.",
        2,
      );
    }
    instance.originValue = `http://127.0.0.1:${address.port}/`;
    return instance;
  }

  get origin(): string {
    return this.originValue;
  }

  setManifestPage(page: string): void {
    this.manifestPage = page;
  }

  private handle(
    method: string,
    rawUrl: string,
    host: string | undefined,
    response: import("node:http").ServerResponse,
  ): void {
    const expectedHost = new URL(this.origin).host;
    if (method !== "GET" || host !== expectedHost || rawUrl.length > 2048) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Invalid loopback request.\n");
      return;
    }
    const parsed = new URL(rawUrl, this.origin);
    if (parsed.pathname === "/start" && this.manifestPage) {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'unsafe-inline'; form-action https://github.com",
      });
      response.end(this.manifestPage);
      return;
    }
    try {
      if (parsed.pathname === "/callback") {
        this.registration.resolve(
          parseRegistrationCallback(rawUrl, this.origin, this.state),
        );
        response.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(
          "GitHub App registration received. Return to the terminal.\n",
        );
        return;
      }
      if (parsed.pathname === "/installed") {
        this.installation.resolve(
          parseInstallationCallback(rawUrl, this.origin, this.state),
        );
        response.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(
          "GitHub App installation received. Return to the terminal.\n",
        );
        return;
      }
    } catch (error) {
      if (parsed.pathname === "/callback") this.registration.reject(error);
      if (parsed.pathname === "/installed") this.installation.reject(error);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("GitHub callback validation failed.\n");
      return;
    }
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found.\n");
  }

  waitForRegistration(): Promise<string> {
    return withTimeout(
      this.registration.promise,
      INTERACTIVE_TIMEOUT_MS,
      "REGISTRATION_TIMEOUT",
      "GitHub App registration was not completed within 15 minutes.",
    );
  }

  waitForInstallation(): Promise<number> {
    return withTimeout(
      this.installation.promise,
      INTERACTIVE_TIMEOUT_MS,
      "INSTALLATION_SCOPE_MISMATCH",
      "GitHub App installation was not completed within 15 minutes.",
    );
  }

  async close(): Promise<void> {
    await new Promise<void>((resolveClose) =>
      this.server.close(() => resolveClose()),
    );
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  code: "REGISTRATION_TIMEOUT" | "INSTALLATION_SCOPE_MISMATCH",
  message: string,
): Promise<T> {
  return new Promise<T>((resolveValue, rejectValue) => {
    const timer = setTimeout(
      () => rejectValue(new ReleaseAppError(code, message, 1)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolveValue(value);
      },
      (error) => {
        clearTimeout(timer);
        rejectValue(error);
      },
    );
  });
}

export function browserCommand(
  platform: NodeJS.Platform,
  url: string,
): { command: string; args: string[] } {
  if (platform === "darwin") return { command: "open", args: [url] };
  if (platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "start", "", url],
    };
  }
  return { command: "xdg-open", args: [url] };
}

function openBrowser(url: string): boolean {
  const candidate = browserCommand(process.platform, url);
  const result = spawnSync(candidate.command, candidate.args, {
    stdio: "ignore",
    timeout: 10_000,
  });
  return !result.error && result.status === 0;
}

function announceBrowser(url: string, json: boolean): void {
  const opened = openBrowser(url);
  const message = opened
    ? `Opened ${url}`
    : `Open this URL in a browser: ${url}`;
  (json ? process.stderr : process.stdout).write(`${message}\n`);
}

async function appRequest(
  endpoint: string,
  token: string,
  method = "GET",
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com${endpoint}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": "create-next-pro-release-app-setup",
      },
    });
  } catch {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "The GitHub App API request could not be completed.",
      2,
    );
  }
  if (!response.ok) {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      `The GitHub App API request failed with HTTP ${response.status}.`,
      2,
    );
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ReleaseAppError(
      "PRECONDITION_FAILED",
      "The GitHub App API returned invalid JSON.",
      2,
    );
  }
}

async function validateWithPrivateKey(
  policy: GovernancePolicy,
  app: ConvertedReleaseApp,
  installationId: number,
): Promise<ReleaseAppInstallation> {
  const jwt = createReleaseAppJwt(app.id, app.privateKey);
  validateAuthenticatedApp(await appRequest("/app", jwt), policy, app.id);
  const installation = await appRequest(
    `/app/installations/${installationId}`,
    jwt,
  );
  const tokenResponse = record(
    await appRequest(
      `/app/installations/${installationId}/access_tokens`,
      jwt,
      "POST",
    ),
  );
  const installationToken = string(tokenResponse.token);
  if (!installationToken) {
    throw new ReleaseAppError(
      "INSTALLATION_SCOPE_MISMATCH",
      "GitHub did not issue an installation token for the release App.",
      1,
    );
  }
  const repositories = await appRequest(
    "/installation/repositories?per_page=100",
    installationToken,
  );
  return validateReleaseAppInstallation(
    installation,
    repositories,
    policy,
    app.id,
  );
}

function matchingInstallation(
  policy: GovernancePolicy,
  snapshot: RemoteSnapshot,
  appId: number,
): unknown | undefined {
  return snapshot.installationValues.find((value) => {
    const candidate = record(value);
    return (
      candidate.app_id === appId &&
      candidate.app_slug === policy.release.appSlug
    );
  });
}

function validateWithOperatorSnapshot(
  policy: GovernancePolicy,
  snapshot: RemoteSnapshot,
  appId: number,
): ReleaseAppInstallationMetadata {
  const installation = matchingInstallation(policy, snapshot, appId);
  if (!installation) {
    throw new ReleaseAppError(
      "INSTALLATION_SCOPE_MISMATCH",
      "The governed release App is not installed on the organization.",
      1,
    );
  }
  const installationId = positiveInteger(record(installation).id);
  if (!installationId) {
    throw new ReleaseAppError(
      "INSTALLATION_SCOPE_MISMATCH",
      "GitHub returned an invalid release App installation identifier.",
      2,
    );
  }
  return validateReleaseAppInstallationMetadata(installation, policy, appId);
}

export function configureReleaseAppEnvironment(
  policy: GovernancePolicy,
  appId: number,
  privateKey: string,
  runner: ProcessRunner = defaultRunner,
): void {
  const common = [
    "--repo",
    policy.repository,
    "--env",
    policy.environment.name,
  ];
  runner("gh", [
    "variable",
    "set",
    policy.release.appIdVariable,
    ...common,
    "--body",
    String(appId),
  ]);
  try {
    runner(
      "gh",
      ["secret", "set", policy.release.privateKeySecret, ...common],
      { input: privateKey },
    );
  } catch {
    try {
      runner("gh", [
        "variable",
        "delete",
        policy.release.appIdVariable,
        ...common,
      ]);
    } catch {
      // The safe error below reports the residual variable without exposing data.
    }
    throw new ReleaseAppError(
      "ENV_CONFIGURATION_FAILED",
      `Failed to store ${policy.release.privateKeySecret}; the newly created App ID variable was rolled back when possible.`,
      2,
    );
  }
}

async function waitForInstalledApp(
  policy: GovernancePolicy,
  appId: number,
  runner: ProcessRunner,
): Promise<RemoteSnapshot> {
  const deadline = Date.now() + INTERACTIVE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const snapshot = collectRemoteSnapshot(policy, runner);
    if (matchingInstallation(policy, snapshot, appId)) return snapshot;
    await new Promise((resolveWait) => setTimeout(resolveWait, 3_000));
  }
  throw new ReleaseAppError(
    "INSTALLATION_SCOPE_MISMATCH",
    "GitHub App installation was not detected within 15 minutes.",
    1,
  );
}

function smokeRun(value: unknown): SmokeRun | undefined {
  const candidate = record(value);
  const databaseId = positiveInteger(candidate.databaseId);
  if (!databaseId) return undefined;
  return {
    databaseId,
    status: string(candidate.status),
    conclusion: string(candidate.conclusion),
    url: string(candidate.url),
    displayTitle: string(candidate.displayTitle),
  };
}

export function selectSmokeRun(
  value: unknown,
  correlationId: string,
): SmokeRun | undefined {
  const expectedTitle = `Release App smoke ${correlationId}`;
  return array(value)
    .map(smokeRun)
    .find((candidate) => candidate?.displayTitle === expectedTitle);
}

async function findSmokeRun(
  policy: GovernancePolicy,
  correlationId: string,
  runner: ProcessRunner,
): Promise<SmokeRun> {
  const deadline = Date.now() + 2 * 60 * 1000;
  while (Date.now() < deadline) {
    const runs = ghJson(
      runner,
      [
        "run",
        "list",
        "--repo",
        policy.repository,
        "--workflow",
        WORKFLOW,
        "--event",
        "workflow_dispatch",
        "--branch",
        policy.repositorySettings.defaultBranch,
        "--limit",
        "20",
        "--json",
        "databaseId,status,conclusion,url,displayTitle",
      ],
      "GitHub workflow runs",
    );
    const match = selectSmokeRun(runs, correlationId);
    if (match) return match;
    await new Promise((resolveWait) => setTimeout(resolveWait, 3_000));
  }
  throw new ReleaseAppError(
    "SMOKE_FAILED",
    "The correlated release App smoke run did not appear within two minutes.",
    1,
  );
}

async function runSmoke(
  policy: GovernancePolicy,
  runner: ProcessRunner,
): Promise<ReleaseAppCommandResult["smoke"]> {
  const correlationId = randomUUID();
  runner("gh", [
    "workflow",
    "run",
    WORKFLOW,
    "--repo",
    policy.repository,
    "--ref",
    policy.repositorySettings.defaultBranch,
    "--raw-field",
    `correlation_id=${correlationId}`,
  ]);
  const discovered = await findSmokeRun(policy, correlationId, runner);
  try {
    runner(
      "gh",
      [
        "run",
        "watch",
        String(discovered.databaseId),
        "--repo",
        policy.repository,
        "--exit-status",
        "--interval",
        "5",
      ],
      { timeoutMs: 11 * 60 * 1000 },
    );
  } catch {
    throw new ReleaseAppError(
      "SMOKE_FAILED",
      `Release App smoke run ${discovered.databaseId} failed.`,
      1,
      discovered.url,
    );
  }
  const completed = record(
    ghJson(
      runner,
      [
        "run",
        "view",
        String(discovered.databaseId),
        "--repo",
        policy.repository,
        "--json",
        "databaseId,status,conclusion,url,displayTitle",
      ],
      "GitHub workflow run",
    ),
  );
  if (completed.status !== "completed" || completed.conclusion !== "success") {
    throw new ReleaseAppError(
      "SMOKE_FAILED",
      `Release App smoke run ${discovered.databaseId} did not complete successfully.`,
      1,
      string(completed.url) || discovered.url,
    );
  }
  return {
    runId: discovered.databaseId,
    url: string(completed.url) || discovered.url,
    conclusion: "success",
  };
}

function appOutput(
  policy: GovernancePolicy,
  appId: number,
  installation?: Pick<ReleaseAppInstallation, "id">,
): NonNullable<ReleaseAppCommandResult["app"]> {
  return {
    id: appId,
    slug: policy.release.appSlug,
    owner: policy.release.appOwner,
    ...(installation ? { installationId: installation.id } : {}),
  };
}

async function createAndInstall(
  policy: GovernancePolicy,
  snapshot: RemoteSnapshot,
  runner: ProcessRunner,
  json: boolean,
): Promise<{ appId: number; installation: ReleaseAppInstallation }> {
  const state = randomBytes(32).toString("base64url");
  const loopback = await LoopbackServer.start(state);
  let credentialsStored = false;
  try {
    const manifest = buildReleaseAppManifest(policy, loopback.origin, state);
    loopback.setManifestPage(buildManifestPage(policy, manifest, state));
    announceBrowser(new URL("start", loopback.origin).toString(), json);
    const code = await loopback.waitForRegistration();
    const app = validateManifestConversion(
      ghApi(runner, `app-manifests/${code}/conversions`, "POST"),
      policy,
    );
    const jwt = createReleaseAppJwt(app.id, app.privateKey);
    validateAuthenticatedApp(await appRequest("/app", jwt), policy, app.id);
    configureReleaseAppEnvironment(policy, app.id, app.privateKey, runner);
    credentialsStored = true;
    announceBrowser(
      buildReleaseAppInstallationUrl(
        policy,
        snapshot.organizationId,
        snapshot.repositoryId,
      ),
      json,
    );
    const installationId = await loopback.waitForInstallation();
    const installation = await validateWithPrivateKey(
      policy,
      app,
      installationId,
    );
    return { appId: app.id, installation };
  } catch (error) {
    if (credentialsStored && error instanceof ReleaseAppError) {
      throw new ReleaseAppError(
        error.code,
        `${error.message} The App ID and private key remain stored in ${policy.environment.name} for a safe retry.`,
        error.exitCode,
        error.hint ??
          "Keep RELEASE_ENABLED=false, correct the installation, and rerun setup.",
      );
    }
    throw error;
  } finally {
    await loopback.close();
  }
}

async function setup(
  policy: GovernancePolicy,
  runner: ProcessRunner,
  json: boolean,
): Promise<ReleaseAppCommandResult> {
  let snapshot = collectRemoteSnapshot(policy, runner);
  assertSetupPreconditions(policy, snapshot, runner);
  const decision = decideReleaseAppSetup(snapshot, policy);
  let appId: number;
  let installation: Pick<ReleaseAppInstallation, "id">;
  let created = false;
  if (decision.action === "create") {
    const createdState = await createAndInstall(policy, snapshot, runner, json);
    appId = createdState.appId;
    installation = createdState.installation;
    created = true;
  } else if (decision.action === "resume-installation") {
    appId = decision.appId;
    announceBrowser(
      buildReleaseAppInstallationUrl(
        policy,
        snapshot.organizationId,
        snapshot.repositoryId,
      ),
      json,
    );
    snapshot = await waitForInstalledApp(policy, appId, runner);
    installation = validateWithOperatorSnapshot(policy, snapshot, appId);
  } else {
    appId = decision.appId;
    installation = validateWithOperatorSnapshot(policy, snapshot, appId);
  }
  const smoke = await runSmoke(policy, runner);
  return safeReleaseAppResult(policy, "setup", {
    status: created ? "configured" : "already-configured",
    exitCode: 0,
    app: appOutput(policy, appId, installation),
    environment: {
      name: policy.environment.name,
      appIdVariable: policy.release.appIdVariable,
      privateKeySecret: policy.release.privateKeySecret,
      releaseEnabled: false,
    },
    smoke,
  });
}

function check(
  policy: GovernancePolicy,
  runner: ProcessRunner,
): ReleaseAppCommandResult {
  const snapshot = collectRemoteSnapshot(policy, runner);
  assertRepositoryAccess(policy, snapshot);
  const decision = decideReleaseAppSetup(snapshot, policy);
  if (decision.action === "create") {
    throw new ReleaseAppError(
      "PARTIAL_CONFIGURATION",
      "The governed release App has not been configured.",
      1,
    );
  }
  if (decision.action === "resume-installation") {
    throw new ReleaseAppError(
      "PARTIAL_CONFIGURATION",
      "The release App credentials exist, but the App is not installed.",
      1,
    );
  }
  const installation = validateWithOperatorSnapshot(
    policy,
    snapshot,
    decision.appId,
  );
  return safeReleaseAppResult(policy, "check", {
    status: "configured",
    exitCode: 0,
    app: appOutput(policy, decision.appId, installation),
    environment: {
      name: policy.environment.name,
      appIdVariable: policy.release.appIdVariable,
      privateKeySecret: policy.release.privateKeySecret,
      releaseEnabled: false,
    },
  });
}

async function smoke(
  policy: GovernancePolicy,
  runner: ProcessRunner,
): Promise<ReleaseAppCommandResult> {
  const checked = check(policy, runner);
  return safeReleaseAppResult(policy, "smoke", {
    status: "configured",
    exitCode: 0,
    app: checked.app,
    environment: checked.environment,
    smoke: await runSmoke(policy, runner),
  });
}

function printResult(result: ReleaseAppCommandResult, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  const headline =
    result.status === "configured" || result.status === "already-configured"
      ? "SUCCESS"
      : result.status === "incomplete"
        ? "INCOMPLETE"
        : "FAILED";
  process.stdout.write(
    `${headline}: release App ${result.app?.slug ?? "configuration"} for ${result.repository}.\n`,
  );
  if (result.app) {
    process.stdout.write(
      `App ID ${result.app.id}${result.app.installationId ? `, installation ${result.app.installationId}` : ""}.\n`,
    );
  }
  if (result.smoke) {
    process.stdout.write(`Smoke run: ${result.smoke.url}\n`);
  }
  if (result.error) {
    process.stderr.write(`${result.error.code}: ${result.error.message}\n`);
    if (result.error.hint) process.stderr.write(`Hint: ${result.error.hint}\n`);
  }
}

function errorResult(
  policy: GovernancePolicy,
  command: ReleaseAppCommandResult["command"],
  error: unknown,
): ReleaseAppCommandResult {
  const safeError =
    error instanceof ReleaseAppError
      ? error
      : new ReleaseAppError(
          "PRECONDITION_FAILED",
          "Release App setup failed unexpectedly without exposing the underlying response.",
          2,
        );
  return safeReleaseAppResult(policy, command, {
    status: safeError.exitCode === 1 ? "incomplete" : "failed",
    exitCode: safeError.exitCode,
    error: {
      code: safeError.code,
      message: safeError.message,
      ...(safeError.hint ? { hint: safeError.hint } : {}),
    },
  });
}

export async function main(
  runner: ProcessRunner = defaultRunner,
): Promise<ReleaseAppCommandResult> {
  const command = process.argv[2] ?? "check";
  const json = hasArgument("--json");
  const policy = readPolicy();
  if (command !== "setup" && command !== "check" && command !== "smoke") {
    const result = errorResult(
      policy,
      "check",
      new ReleaseAppError(
        "PRECONDITION_FAILED",
        `Unknown release App command: ${command}.`,
        2,
      ),
    );
    printResult(result, json);
    process.exitCode = result.exitCode;
    return result;
  }
  let result: ReleaseAppCommandResult;
  try {
    result =
      command === "setup"
        ? await setup(policy, runner, json)
        : command === "smoke"
          ? await smoke(policy, runner)
          : check(policy, runner);
  } catch (error) {
    result = errorResult(policy, command, error);
  }
  printResult(result, json);
  process.exitCode = result.exitCode;
  return result;
}

const entrypoint = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (entrypoint) void main();
