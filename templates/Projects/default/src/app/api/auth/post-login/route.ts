import { getToken } from "next-auth/jwt";
import { sign } from "jsonwebtoken";
import { NextResponse, NextRequest } from "next/server";
import { redirect } from "@/lib/i18n/navigation";
// import { NextURL } from "next/dist/server/web/next-url";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) {
    const appJwt = sign(
      { id: token.id, email: token.email, name: token.name },
      process.env.APP_JWT_SECRET!,
      { expiresIn: "7d" }
    );
    const res = NextResponse.redirect(req.nextUrl.origin + "/");
    res.cookies.set("app_token", appJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }
  // Si pas de token, redirige vers login
  return redirect({ href: "/login", locale: "en" });
}
