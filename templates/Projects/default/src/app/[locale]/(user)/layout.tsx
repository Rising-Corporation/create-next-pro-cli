// app/[locale]/(user)/layout.tsx
import { auth, isAuthConfigured } from "@/auth";
import { redirect } from "@/lib/i18n/navigation";
import GlobalHeader from "@/ui/_global/GlobalHeader";
import GlobalMain from "@/ui/_global/GlobalMain";

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAuthConfigured()) {
    redirect({ href: "/login", locale });
  }

  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  return (
    <>
      <GlobalHeader hasSessionInitial />
      <GlobalMain>{children}</GlobalMain>
    </>
  );
}
