import { createHash } from "node:crypto";

import type { PackageManager } from "./package-manager.ts";

export interface AuditFinding {
  advisoryId: string;
  packageName: string;
  severity: string;
  paths: string[];
  devOnly: boolean | null;
}

export interface NormalizedAuditReport {
  manager: PackageManager;
  findings: AuditFinding[];
  graphPackages: string[];
  graphPaths: string[];
}

export interface AuditManifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface AuditPolicyContext {
  now: Date;
  manifest: AuditManifest;
  bunWhy?: string;
}

export interface AuditPolicyDecision {
  accepted: boolean;
  allowedAdvisories: string[];
  errors: string[];
}

interface TemporaryAuditException {
  advisoryId: string;
  packageName: string;
  justification: string;
  expiresOn: string;
  dependencyRoots: string[];
  npm: {
    packageCount: number;
    packageFingerprint: string;
    pathCount: number;
    pathFingerprint: string;
  };
  pnpm: {
    pathCount: number;
    pathFingerprint: string;
  };
  bun: {
    graphFingerprint: string;
  };
  rootBun: {
    projectName: string;
    dependencyRoots: string[];
    graphFingerprint: string;
  };
}

export const TEMPORARY_AUDIT_EXCEPTION: TemporaryAuditException = {
  advisoryId: "GHSA-mh99-v99m-4gvg",
  packageName: "brace-expansion",
  justification:
    "The vulnerable version is reachable only from ESLint development tooling, and no compatible upstream ESLint plugin release is available.",
  expiresOn: "2026-08-08",
  dependencyRoots: ["eslint", "eslint-config-next"],
  npm: {
    packageCount: 9,
    packageFingerprint:
      "5c2f95af65c41494d74ca588887b735d7f53598759c1f4a550a534118ef9e21c",
    pathCount: 9,
    pathFingerprint:
      "266ffc5bacefb7aba510ab245573622ec8a47d32ce6408bfd4c3560f698fd589",
  },
  pnpm: {
    pathCount: 82,
    pathFingerprint:
      "135eeca335243a379f1c232df59dd641cd9d1684de814d4eac9105ded322e30f",
  },
  bun: {
    graphFingerprint:
      "bb8a9e09875f4a36186f4b43b8035cd6baa47b35a2614cd1e110b4129692cc62",
  },
  rootBun: {
    projectName: "create-next-pro-cli",
    dependencyRoots: ["eslint", "typescript-eslint", "tsup"],
    graphFingerprint:
      "9526795395c1d3983bb9d8fbcfce098103420ebe6f48169ab3fb4acc8f3aa769",
  },
};

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${label} in audit JSON.`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label} in audit JSON.`);
  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${label} in audit JSON.`);
  }
  return value;
}

function strings(value: unknown, label: string): string[] {
  return asArray(value, label).map((entry) => asString(entry, label));
}

function advisoryIdFromUrl(value: unknown): string {
  const url = asString(value, "advisory URL");
  const match = /\/(GHSA-[a-z0-9-]+)$/i.exec(url);
  if (!match) throw new Error(`Unsupported advisory URL: ${url}.`);
  return match[1];
}

function parseJsonPayload(output: string): Record<string, unknown> {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start)
    throw new Error("Audit output contains no JSON object.");
  try {
    return asRecord(JSON.parse(output.slice(start, end + 1)), "audit report");
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("Audit output contains invalid JSON.");
    throw error;
  }
}

function deduplicateFindings(findings: AuditFinding[]): AuditFinding[] {
  const unique = new Map<string, AuditFinding>();
  for (const finding of findings) {
    const key = `${finding.advisoryId}:${finding.packageName}`;
    const previous = unique.get(key);
    if (!previous) {
      unique.set(key, {
        ...finding,
        paths: [...new Set(finding.paths)].sort(),
      });
      continue;
    }
    previous.paths = [...new Set([...previous.paths, ...finding.paths])].sort();
    previous.devOnly = previous.devOnly === true && finding.devOnly === true;
  }
  return [...unique.values()].sort((left, right) =>
    left.advisoryId.localeCompare(right.advisoryId),
  );
}

function parseBunReport(root: Record<string, unknown>): NormalizedAuditReport {
  const findings: AuditFinding[] = [];
  for (const [packageName, advisories] of Object.entries(root)) {
    for (const entry of asArray(
      advisories,
      `Bun advisories for ${packageName}`,
    )) {
      const advisory = asRecord(entry, `Bun advisory for ${packageName}`);
      findings.push({
        advisoryId: advisoryIdFromUrl(advisory.url),
        packageName,
        severity: asString(advisory.severity, "Bun advisory severity"),
        paths: [],
        devOnly: null,
      });
    }
  }
  return {
    manager: "bun",
    findings: deduplicateFindings(findings),
    graphPackages: Object.keys(root).sort(),
    graphPaths: [],
  };
}

function parseNpmReport(root: Record<string, unknown>): NormalizedAuditReport {
  const vulnerabilities = asRecord(root.vulnerabilities, "npm vulnerabilities");
  const findings: AuditFinding[] = [];
  const graphPaths: string[] = [];
  for (const [packageName, value] of Object.entries(vulnerabilities)) {
    const vulnerability = asRecord(
      value,
      `npm vulnerability for ${packageName}`,
    );
    const nodes = strings(vulnerability.nodes, `npm nodes for ${packageName}`);
    graphPaths.push(...nodes);
    for (const viaEntry of asArray(
      vulnerability.via,
      `npm via for ${packageName}`,
    )) {
      if (typeof viaEntry === "string") continue;
      const advisory = asRecord(viaEntry, `npm advisory for ${packageName}`);
      findings.push({
        advisoryId: advisoryIdFromUrl(advisory.url),
        packageName: asString(advisory.dependency, "npm advisory dependency"),
        severity: asString(advisory.severity, "npm advisory severity"),
        paths: nodes,
        devOnly: null,
      });
    }
  }
  return {
    manager: "npm",
    findings: deduplicateFindings(findings),
    graphPackages: Object.keys(vulnerabilities).sort(),
    graphPaths: [...new Set(graphPaths)].sort(),
  };
}

function parsePnpmReport(root: Record<string, unknown>): NormalizedAuditReport {
  const advisories = asRecord(root.advisories, "pnpm advisories");
  const findings: AuditFinding[] = [];
  for (const value of Object.values(advisories)) {
    const advisory = asRecord(value, "pnpm advisory");
    const paths: string[] = [];
    let devOnly = true;
    for (const entry of asArray(advisory.findings, "pnpm findings")) {
      const finding = asRecord(entry, "pnpm finding");
      paths.push(...strings(finding.paths, "pnpm finding paths"));
      devOnly = devOnly && finding.dev === true;
    }
    findings.push({
      advisoryId: asString(advisory.github_advisory_id, "pnpm advisory ID"),
      packageName: asString(advisory.module_name, "pnpm advisory package"),
      severity: asString(advisory.severity, "pnpm advisory severity"),
      paths,
      devOnly,
    });
  }
  const normalized = deduplicateFindings(findings);
  return {
    manager: "pnpm",
    findings: normalized,
    graphPackages: normalized.map((finding) => finding.packageName).sort(),
    graphPaths: normalized.flatMap((finding) => finding.paths).sort(),
  };
}

export function normalizeAuditReport(
  manager: PackageManager,
  output: string,
): NormalizedAuditReport {
  const root = parseJsonPayload(output);
  if (manager === "bun") return parseBunReport(root);
  if (manager === "npm") return parseNpmReport(root);
  return parsePnpmReport(root);
}

function fingerprint(values: string[]): string {
  return createHash("sha256")
    .update([...new Set(values)].sort().join("\n"))
    .digest("hex");
}

function isDevelopmentOnly(
  manifest: AuditManifest,
  packageName: string,
): boolean {
  return (
    Object.hasOwn(manifest.devDependencies ?? {}, packageName) &&
    !Object.hasOwn(manifest.dependencies ?? {}, packageName)
  );
}

function normalizedBunGraph(output: string): string {
  return output
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/dev [^\s(]+/g, "dev <project>")
    .replaceAll("\r\n", "\n")
    .trim();
}

function validateManagerEvidence(
  report: NormalizedAuditReport,
  context: AuditPolicyContext,
): string[] {
  const policy = TEMPORARY_AUDIT_EXCEPTION;
  if (report.manager === "pnpm") {
    const finding = report.findings[0];
    if (!finding.devOnly) return ["The pnpm advisory is not development-only."];
    if (
      report.graphPaths.length !== policy.pnpm.pathCount ||
      fingerprint(report.graphPaths) !== policy.pnpm.pathFingerprint
    ) {
      return [
        "The pnpm advisory dependency paths do not match the approved graph.",
      ];
    }
    return [];
  }

  if (report.manager === "npm") {
    if (
      report.graphPackages.length !== policy.npm.packageCount ||
      fingerprint(report.graphPackages) !== policy.npm.packageFingerprint ||
      report.graphPaths.length !== policy.npm.pathCount ||
      fingerprint(report.graphPaths) !== policy.npm.pathFingerprint
    ) {
      return [
        "The npm advisory dependency graph does not match the approved graph.",
      ];
    }
    return [];
  }

  const projectName = context.manifest.name;
  if (!projectName || !context.bunWhy) {
    return ["Bun audit policy requires the project name and dependency graph."];
  }
  const graphFingerprint = createHash("sha256")
    .update(normalizedBunGraph(context.bunWhy))
    .digest("hex");
  const expectedFingerprint =
    projectName === policy.rootBun.projectName
      ? policy.rootBun.graphFingerprint
      : policy.bun.graphFingerprint;
  if (graphFingerprint !== expectedFingerprint) {
    return [
      "The Bun advisory dependency graph does not match the approved graph.",
    ];
  }
  return [];
}

export function evaluateAuditPolicy(
  report: NormalizedAuditReport,
  context: AuditPolicyContext,
): AuditPolicyDecision {
  if (report.findings.length === 0) {
    return { accepted: true, allowedAdvisories: [], errors: [] };
  }

  const policy = TEMPORARY_AUDIT_EXCEPTION;
  const errors: string[] = [];
  const currentDate = context.now.toISOString().slice(0, 10);
  if (currentDate > policy.expiresOn) {
    errors.push(`The audit exception expired on ${policy.expiresOn}.`);
  }
  if (
    report.findings.length !== 1 ||
    report.findings[0].advisoryId !== policy.advisoryId ||
    report.findings[0].packageName !== policy.packageName
  ) {
    errors.push(
      "The audit contains an advisory that is not explicitly allowed.",
    );
  }
  const dependencyRoots =
    report.manager === "bun" &&
    context.manifest.name === policy.rootBun.projectName
      ? policy.rootBun.dependencyRoots
      : policy.dependencyRoots;
  for (const dependencyRoot of dependencyRoots) {
    if (!isDevelopmentOnly(context.manifest, dependencyRoot)) {
      errors.push(`${dependencyRoot} is not confined to devDependencies.`);
    }
  }
  if (errors.length === 0) {
    errors.push(...validateManagerEvidence(report, context));
  }

  return {
    accepted: errors.length === 0,
    allowedAdvisories: errors.length === 0 ? [policy.advisoryId] : [],
    errors,
  };
}
