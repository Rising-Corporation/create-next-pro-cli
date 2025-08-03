// app/[locale]/(user)/layout.tsx

import UserNav from "@/ui/_global/UserNav";
import LocaleSwitcher from "@/ui/_global/LocaleSwitcher";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
