"use server";
// src/lib/auth/isConnected.ts
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export async function isConnected(): Promise<boolean> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (accessToken) {
    try {
      verify(accessToken, process.env.APP_JWT_SECRET!);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
