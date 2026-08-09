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

export interface AuditPolicyDecision {
  accepted: boolean;
  allowedAdvisories: string[];
  errors: string[];
}

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

export function evaluateAuditPolicy(
  report: NormalizedAuditReport,
): AuditPolicyDecision {
  if (report.findings.length === 0) {
    return { accepted: true, allowedAdvisories: [], errors: [] };
  }

  return {
    accepted: false,
    allowedAdvisories: [],
    errors: report.findings.map(
      (finding) =>
        `${finding.advisoryId} affects ${finding.packageName} (${finding.severity}).`,
    ),
  };
}
