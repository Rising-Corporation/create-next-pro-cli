import { evaluateAuditPolicy, normalizeAuditReport } from "./audit-policy.ts";
import {
  capturePackageManager,
  resolvePackageManager,
} from "./package-manager.ts";

async function runAudit(): Promise<void> {
  const manager = resolvePackageManager();
  const root = process.cwd();
  const audit = await capturePackageManager(manager, ["audit", "--json"], {
    cwd: root,
  });
  if (audit.exitCode !== 0 && audit.exitCode !== 1) {
    throw new Error(
      `${manager} audit failed${audit.signal ? ` with signal ${audit.signal}` : ` with exit code ${audit.exitCode ?? "unknown"}`}: ${audit.stderr.trim() || "no diagnostic was provided"}`,
    );
  }

  const report = normalizeAuditReport(manager, audit.stdout);
  const decision = evaluateAuditPolicy(report);
  if (!decision.accepted) {
    throw new Error(`Security audit rejected: ${decision.errors.join(" ")}`);
  }
  process.stdout.write(`Security audit passed for ${manager}.\n`);
}

try {
  await runAudit();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
