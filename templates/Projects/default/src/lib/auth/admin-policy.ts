export type AdminEmailPolicy = {
  status: "configured" | "missing" | "invalid";
  emails: ReadonlySet<string>;
};

const CONTROL_OR_WHITESPACE = /[\u0000-\u0020\u007f]/u;

function normalizeEmail(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized || CONTROL_OR_WHITESPACE.test(normalized)) return undefined;
  const parts = normalized.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return undefined;
  return normalized;
}

export function parseAdminEmailAllowlist(
  value: string | undefined,
): AdminEmailPolicy {
  if (!value || value.trim().length === 0) {
    return { status: "missing", emails: new Set() };
  }

  const emails = new Set<string>();
  for (const entry of value.split(",")) {
    const normalized = normalizeEmail(entry);
    if (!normalized) return { status: "invalid", emails: new Set() };
    emails.add(normalized);
  }

  return { status: "configured", emails };
}

export function isAdminEmailAllowed(
  email: string | null | undefined,
  allowlist: string | undefined,
): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const policy = parseAdminEmailAllowlist(allowlist);
  return policy.status === "configured" && policy.emails.has(normalized);
}
