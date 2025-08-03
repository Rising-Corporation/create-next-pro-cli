import { sign } from "jsonwebtoken";
import NextAuth from "next-auth";
//import { authOptions } from "@/auth.config";
import type {
  NextAuthOptions,
  Session,
  User,
  Account,
  Profile,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

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
      // On ne met rien dans le token NextAuth
      // Le token JWT applicatif est géré dans le middleware
      // et dans le callback de la route d'authentification
      // pour éviter de le stocker dans la session NextAuth
      // et de le renvoyer au client.
      // Il est uniquement utilisé côté serveur pour vérifier l'authentification.
      // On peut ajouter des données supplémentaires si nécessaire
      // mais pour l'instant, on garde le token minimaliste.
      // Exemple d'ajout de données :
      // token.customData = "some data";
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // On ne met rien dans la session NextAuth
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
      // Après login, redirige vers l'endpoint qui pose le cookie JWT applicatif
      // console.log("Before Redirect Callback :", { url: url, baseUrl: baseUrl });
      const customCallbackRoute = "/api/auth/post-login";
      /*  if (url.startsWith(baseUrl)) {
        console.log("Redirecting to post-login endpoint");
        return "/api/auth/post-login";
      } */
      // console.log("Redirecting to base URL + customCallbackRoute");
      return baseUrl + customCallbackRoute;
    },
  },
  // Ajoute ici d'autres options/callbacks si besoin
};

// Suppression de customJwtCookie : la pose du cookie se fait dans /api/auth/post-login

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
