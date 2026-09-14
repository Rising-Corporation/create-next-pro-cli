import { expect, test } from "@playwright/test";
import sharp from "sharp";

for (const pathname of [
  "/missing.png",
  "/missing.ico",
  "/en/missing.png",
  "/fr/missing.png",
  "/zz/missing.png",
  "/en/this-page-does-not-exist",
  "/fr/this-page-does-not-exist",
]) {
  test(`missing resource returns 404: ${pathname}`, async ({ request }) => {
    const response = await request.get(pathname, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toContain("text/html");
  });
}

test("public pages, metadata, assets and auth keep their HTTP contracts", async ({
  request,
}) => {
  for (const pathname of ["/en", "/fr", "/en/login", "/fr/login"]) {
    const response = await request.get(pathname, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
  }
  for (const [pathname, contentType] of [
    ["/sitemap.xml", "xml"],
    ["/logo.png", "image/png"],
    ["/logo.svg", "image/svg+xml"],
  ]) {
    const response = await request.get(pathname, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(contentType);
  }
  const auth = await request.get("/api/auth/providers");
  expect(auth.status()).toBe(503);
  await expect(auth.json()).resolves.toEqual({
    error: "Authentication is not configured for this deployment.",
  });
  const privatePage = await request.get("/en/dashboard", { maxRedirects: 0 });
  if (privatePage.status() === 200) {
    // Next.js can redirect through a meta tag after streaming has started.
    const body = await privatePage.text();
    expect(body).toMatch(
      /<meta[^>]+http-equiv="refresh"[^>]+content="[^";]*;url=\/en\/login"/,
    );
    expect(body).not.toMatch(/<h1[^>]*>Dashboard<\/h1>/);
  } else {
    expect([303, 307, 308]).toContain(privatePage.status());
    expect(privatePage.headers().location).toMatch(/\/en\/login$/);
  }
});

test("optimizes a valid PNG and serves the cached result", async ({
  request,
}) => {
  const pathname = "/_next/image?url=%2Flogo.png&w=64&q=75";
  const first = await request.get(pathname, {
    headers: { accept: "image/webp" },
  });
  expect(first.status()).toBe(200);
  expect(first.headers()["content-type"]).toContain("image/webp");
  const image = await first.body();
  expect(image.length).toBeGreaterThan(0);
  expect((await sharp(image).metadata()).width).toBe(64);
  const cached = await request.get(pathname, {
    headers: { accept: "image/webp" },
  });
  expect(cached.status()).toBe(200);
  expect(await cached.body()).toEqual(image);
  expect(cached.headers().etag).toBe(first.headers().etag);
});

test("optimizes valid AVIF input with the patched decoder", async ({
  request,
}) => {
  const source = await request.get("/test-fixtures/pixel.avif");
  expect(source.status()).toBe(200);
  expect(source.headers()["content-type"]).toContain("image/avif");
  const optimized = await request.get(
    "/_next/image?url=%2Ftest-fixtures%2Fpixel.avif&w=64&q=75",
    { headers: { accept: "image/webp" } },
  );
  expect(optimized.status()).toBe(200);
  expect(optimized.headers()["content-type"]).toContain("image/webp");
  const metadata = await sharp(await optimized.body()).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.width).toBe(2);
  expect(metadata.height).toBe(2);
});
