import { scaffoldProject } from "../scaffold";
export async function createProject(nameArg: string, force: boolean) {
  const response = {
    projectName: nameArg,
    useTypescript: true,
    useEslint: true,
    useTailwind: true,
    useSrcDir: true,
    useTurbopack: true,
    useI18n: true,
    customAlias: true,
    importAlias: "@/*",
    force,
  };

  console.log(`📦 Creating project "${response.projectName}"...`);
  await scaffoldProject(response);
}
