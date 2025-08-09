/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Map a key to its corresponding file name for page/component templates.
 * @param key string
 * @returns file name string
 */
export function toFileName(key: string): string {
  switch (key) {
    case "layout":
      return "layout.tsx";
    case "page":
      return "page.tsx";
    case "loading":
      return "loading.tsx";
    case "not-found":
      return "not-found.tsx";
    case "error":
      return "error.tsx";
    case "global-error":
      return "global-error.tsx";
    case "route":
      return "route.ts";
    case "template":
      return "template.tsx";
    case "default":
      return "default.tsx";
    default:
      return `${key}.tsx`;
  }
}
