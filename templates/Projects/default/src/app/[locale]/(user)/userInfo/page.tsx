import { auth } from "@/auth";
import UserInfoPageUI from "@/ui/userInfo/page-ui";

export default async function UserInfoPage() {
  const session = await auth();

  return <UserInfoPageUI user={session?.user} />;
}
