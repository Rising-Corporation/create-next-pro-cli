import { readFile } from "node:fs/promises";
import { join } from "node:path";

type PrerenderManifest = {
  routes: Record<string, unknown>;
};

const manifestPath = join(process.cwd(), ".next", "prerender-manifest.json");
const manifest = JSON.parse(
  await readFile(manifestPath, "utf8"),
) as PrerenderManifest;
const prerenderedRoutes = new Set(Object.keys(manifest.routes));
const expectedPublicRoutes = [
  "/en",
  "/fr",
  "/en/login",
  "/fr/login",
  "/en/register",
  "/fr/register",
  "/sitemap.xml",
];
const privateRoutes = [
  "/en/dashboard",
  "/fr/dashboard",
  "/en/settings",
  "/fr/settings",
  "/en/userInfo",
  "/fr/userInfo",
  "/api/auth/[...nextauth]",
];

const missingPublicRoutes = expectedPublicRoutes.filter(
  (route) => !prerenderedRoutes.has(route),
);
const leakedPrivateRoutes = privateRoutes.filter((route) =>
  prerenderedRoutes.has(route),
);

if (missingPublicRoutes.length > 0 || leakedPrivateRoutes.length > 0) {
  throw new Error(
    [
      missingPublicRoutes.length > 0
        ? `Public routes not prerendered: ${missingPublicRoutes.join(", ")}`
        : null,
      leakedPrivateRoutes.length > 0
        ? `Private routes unexpectedly prerendered: ${leakedPrivateRoutes.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

console.log(
  `Rendering verified: ${expectedPublicRoutes.length} public routes prerendered; private routes remain runtime-only.`,
);
