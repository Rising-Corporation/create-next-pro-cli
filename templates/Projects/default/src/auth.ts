import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getAuthEnv } from "@/env";

const authEnv = getAuthEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authEnv?.secret,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  providers: authEnv
    ? [
        Google({
          clientId: authEnv.googleClientId,
          clientSecret: authEnv.googleClientSecret,
        }),
      ]
    : [],
});

export const isAuthConfigured = () => authEnv !== null;
