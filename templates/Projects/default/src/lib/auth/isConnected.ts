import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export async function isConnected(): Promise<boolean> {
  const cookieStore = await cookies();
  const appToken = cookieStore.get("app_token")?.value;
  if (appToken) {
    try {
      verify(appToken, process.env.APP_JWT_SECRET!);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
