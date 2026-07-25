import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateAuditPolicy,
  normalizeAuditReport,
  TEMPORARY_AUDIT_EXCEPTION,
} from "./audit-policy.ts";
import {
  capturePackageManager,
  resolvePackageManager,
} from "./package-manager.ts";

async function runAudit(): Promise<void> {
  const manager = resolvePackageManager();
  const root = process.cwd();
  const manifest = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  ) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const audit = await capturePackageManager(manager, ["audit", "--json"], {
    cwd: root,
  });
  if (audit.exitCode !== 0 && audit.exitCode !== 1) {
    throw new Error(
      `${manager} audit failed${audit.signal ? ` with signal ${audit.signal}` : ` with exit code ${audit.exitCode ?? "unknown"}`}: ${audit.stderr.trim() || "no diagnostic was provided"}`,
    );
  }

  const report = normalizeAuditReport(manager, audit.stdout);
  let bunWhy: string | undefined;
  if (manager === "bun" && report.findings.length > 0) {
    const why = await capturePackageManager(
      manager,
      ["why", TEMPORARY_AUDIT_EXCEPTION.packageName, "--depth", "20"],
      { cwd: root },
    );
    if (why.exitCode !== 0) {
      throw new Error(
        `bun why failed with exit code ${why.exitCode ?? "unknown"}: ${why.stderr.trim() || "no diagnostic was provided"}`,
      );
    }
    bunWhy = why.stdout;
  }

  const decision = evaluateAuditPolicy(report, {
    now: new Date(),
    manifest,
    bunWhy,
  });
  if (!decision.accepted) {
    throw new Error(`Security audit rejected: ${decision.errors.join(" ")}`);
  }
  if (decision.allowedAdvisories.length === 0) {
    process.stdout.write(`Security audit passed for ${manager}.\n`);
    return;
  }
  process.stdout.write(
    `Security audit passed for ${manager} with temporary development-only exception ${TEMPORARY_AUDIT_EXCEPTION.advisoryId} (${TEMPORARY_AUDIT_EXCEPTION.packageName}); expires ${TEMPORARY_AUDIT_EXCEPTION.expiresOn}.\n`,
  );
}

try {
  await runAudit();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
