import "server-only";

import { isAdminEmailAllowed } from "@/lib/auth/admin-policy";

export function hasAdminAccess(email: string | null | undefined): boolean {
  return isAdminEmailAllowed(email, process.env.AUTH_ADMIN_EMAILS);
}
