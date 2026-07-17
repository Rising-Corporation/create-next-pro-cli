// src/app/[locale]/(public)/login/page.tsx
import LoginPageUI from "@/ui/login/page-ui";

export const dynamic = "force-static";

export default function LoginPage() {
  return <LoginPageUI />;
}
