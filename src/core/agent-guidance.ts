export const PROJECT_SKILL_NAMES = [
  "create-next-pro-create-project",
  "create-next-pro-addcomponent",
  "create-next-pro-addpage",
  "create-next-pro-addlib",
  "create-next-pro-addapi",
  "create-next-pro-addlanguage",
  "create-next-pro-addtext",
  "create-next-pro-rmpage",
] as const;

export const PROJECT_AGENT_GUIDANCE_FILES = [
  "AGENTS.md",
  ...PROJECT_SKILL_NAMES.map((name) => `.agents/skills/${name}/SKILL.md`),
] as const;
