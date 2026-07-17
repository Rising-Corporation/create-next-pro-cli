const env = process.env;

function firstDefined(...names: string[]) {
  for (const name of names) {
    const value = env[name];
    if (value && value.trim().length > 0) {
      return value;
    }
  }
}

export function requireEnv(...names: string[]) {
  const value = firstDefined(...names);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${names.join(" or ")}`,
    );
  }
  return value;
}

export type AuthEnv = {
  secret: string;
  googleClientId: string;
  googleClientSecret: string;
};

export function getAuthEnv() {
  if (env.AUTH_DISABLED === "true") return null;

  const values = {
    secret: firstDefined("AUTH_SECRET", "NEXTAUTH_SECRET"),
    googleClientId: firstDefined("AUTH_GOOGLE_ID", "GOOGLE_CLIENT_ID"),
    googleClientSecret: firstDefined(
      "AUTH_GOOGLE_SECRET",
      "GOOGLE_CLIENT_SECRET",
    ),
  };
  const configuredValues = Object.values(values).filter(Boolean).length;

  if (configuredValues === 0) return null;
  if (configuredValues !== 3) {
    throw new Error(
      "Incomplete Auth.js configuration: secret, Google client ID and Google client secret must be set together",
    );
  }

  return values as AuthEnv;
}

export function getPublicUrl() {
  const configured = firstDefined(
    "NEXT_PUBLIC_APP_URL",
    "PROJECT_PRODUCTION_URL",
  );
  if (!configured) {
    return `http://localhost:${env.PORT || "3000"}`;
  }

  const candidate = configured.startsWith("http")
    ? configured
    : `https://${configured}`;

  return new URL(candidate).origin;
}
