import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin.node.ts"],
  format: ["esm"], // ou ["cjs"] si tu préfères CJS
  target: "node20",
  outDir: "dist",
  dts: false, // évite tout build .d.ts
  clean: true,
  sourcemap: true,
  minify: false,
  //banner: { js: "#!/usr/bin/env node" }, // shebang CLI
});
