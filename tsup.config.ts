import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin.node.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  dts: false,
  clean: true,
  sourcemap: true,
  minify: false,
  external: ["typescript"],
});
