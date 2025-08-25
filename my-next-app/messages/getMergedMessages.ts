// lib/i18n/getMergedMessages.ts
import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";

export default async function getMergedMessages(currentModuleFilename: string) {
  const locale = basename(currentModuleFilename, ".ts");
  const basePath = join(process.cwd(), "messages", locale);
  const merged: Record<string, any> = {};

  try {
    const files = await readdir(basePath);
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await readFile(join(basePath, file), "utf8");
          const key = basename(file, ".json");
          merged[key] = JSON.parse(content);
        } catch (err) {
          console.error(
            `❌ Failed to read ${file} for locale '${locale}':`,
            err,
          );
        }
      }
    }
  } catch (err) {
    console.error(`❌ Failed to read directory '${basePath}':`, err);
  }

  return merged;
}
