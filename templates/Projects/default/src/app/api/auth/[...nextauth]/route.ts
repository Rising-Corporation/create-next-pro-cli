import { handlers, isAuthConfigured } from "@/auth";

const unavailable = () =>
  Response.json(
    { error: "Authentication is not configured for this deployment." },
    { status: 503 },
  );

export const GET = isAuthConfigured() ? handlers.GET : unavailable;
export const POST = isAuthConfigured() ? handlers.POST : unavailable;
