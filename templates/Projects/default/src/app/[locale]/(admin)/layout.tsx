import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { auth, isAuthConfigured } from "@/auth";
import { hasAdminAccess } from "@/lib/auth/admin-access";
import { redirect } from "@/lib/i18n/navigation";
import GlobalHeader from "@/ui/_global/GlobalHeader";
import GlobalMain from "@/ui/_global/GlobalMain";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAuthConfigured()) {
    redirect({ href: "/login", locale });
  }

  const session = await auth();
  const user = session?.user;
  if (!user) {
    return redirect({ href: "/login", locale });
  }
  if (!hasAdminAccess(user.email)) {
    notFound();
  }

  return (
    <>
      <GlobalHeader hasSessionInitial />
      <GlobalMain>{children}</GlobalMain>
    </>
  );
}
