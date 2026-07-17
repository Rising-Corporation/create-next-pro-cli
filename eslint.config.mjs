import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".agent/**",
      ".cursor/**",
      "dist/**",
      "my-next-app/**",
      "node_modules/**",
      "templates/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["src/lib/*.ts"],
    ignores: ["src/lib/*.test.ts"],
    rules: {
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "prompts",
              message: "Use the prompt adapter from CliContext.",
            },
            {
              name: "node:fs",
              message: "Use the file-system adapter from CliContext.",
            },
            {
              name: "node:fs/promises",
              message: "Use the file-system adapter from CliContext.",
            },
          ],
        },
      ],
    },
  },
);
