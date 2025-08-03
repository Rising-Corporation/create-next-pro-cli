// src/scaffold-dev.ts

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Experimental tool for generating a Next.js project template structure.
 * This script is under development and will evolve to allow creation of new project templates in the future.
 *
 * @param options Object containing the project name
 */
async function scaffoldTemplate(options: { projectName: string }) {
  const base = options.projectName;
  console.log(`\n📁 Creating template directory: ${base}`);

  // List of folders to create for the template
  const folders = [
    "app/[locale]/_main",
    "app/[locale]/dashboard",
    "lib/i18n",
    "messages/en",
    "messages/fr",
    "public",
    "styles",
  ];

  // List of files to create for the template
  const files = [
    "app/[locale]/layout.tsx",
    "app/[locale]/page.tsx",
    "app/[locale]/not-found.tsx",
    "app/[locale]/error.tsx",

    "app/[locale]/_main/page.tsx",
    "app/[locale]/_main/layout.tsx",
    "app/[locale]/_main/loading.tsx",
    "app/[locale]/_main/template.tsx",

    "app/[locale]/dashboard/page.tsx",
    "app/[locale]/dashboard/layout.tsx",
    "app/[locale]/dashboard/loading.tsx",
    "app/[locale]/dashboard/template.tsx",

    "lib/i18n/routing.ts",
    "lib/i18n/request.ts",
    "lib/i18n/navigation.ts",

    "messages/en/home.json",
    "messages/en/dashboard.json",
    "messages/en/navbar.json",

    "messages/fr/home.json",
    "messages/fr/dashboard.json",
    "messages/fr/navbar.json",

    "styles/globals.css",
    "middleware.ts",
    "next.config.ts",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "next-env.d.ts",
    "package.json",
    "README.md",
  ];

  // Create all folders
  for (const folder of folders) {
    await mkdir(join(base, folder), { recursive: true });
  }

  // Create all files with a placeholder comment
  for (const file of files) {
    const fullPath = join(base, file);
    await writeFile(fullPath, `// ${file}`);
  }

  console.log("✅ Full template generated.");
}

// Direct execution if this file is run as a script
if (require.main === module) {
  const projectName = process.argv[2] || "template-next-app";
  scaffoldTemplate({ projectName }).catch((err) => {
    console.error("Error during template generation:", err);
    process.exit(1);
  });
}
