import { generatedBuildInfo } from "./generatedBuildInfo";

export const buildInfo = generatedBuildInfo;

export function shortCommit(value: string) {
  if (!value || value === "local") return "local";
  return value.slice(0, 7);
}
