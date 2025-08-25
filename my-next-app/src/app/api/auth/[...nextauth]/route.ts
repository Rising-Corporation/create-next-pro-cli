import NextAuth from "next-auth";
import type {
  NextAuthOptions,
  Session,
  User,
  Account,
  Profile,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      console.log("JWT Callback:", token);

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
    async signIn({
      user,
      account,
      profile,
      email,
      credentials,
    }: {
      user: User;
      account: Account | null;
      profile?: Profile;
      email?: string | { verificationRequest?: boolean };
      credentials?: Record<string, unknown>;
    }) {
      return true;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      const customCallbackRoute = "/api/auth/post-login";

      return baseUrl + customCallbackRoute;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
