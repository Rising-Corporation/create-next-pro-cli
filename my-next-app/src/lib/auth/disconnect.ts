// src/lib/auth/disconnect.ts
"use server";
import { cookies } from "next/headers";

/**
 * Supprime le cookie access_token pour déconnecter l'utilisateur côté serveur.
 */
export async function disconnect() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
}
