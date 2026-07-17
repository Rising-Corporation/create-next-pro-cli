// src/app/[locale]/(public)/register/page.tsx
import RegisterPageUI from "@/ui/register/page-ui";

export const dynamic = "force-static";

export default function RegisterPage() {
  return <RegisterPageUI />;
}
