import { readFile } from "node:fs/promises";
import path from "node:path";
import ignoreLib from "ignore";
import { DEFAULT_IGNORES } from "./config.js";

export async function loadIgnoreRules(rootDir) {
  const ig = ignoreLib().add(DEFAULT_IGNORES);
  try {
    const gitignoreContent = await readFile(
      path.join(rootDir, ".gitignore"),
      "utf-8"
    );
    ig.add(gitignoreContent);
  } catch {
    // no .gitignore present, that's fine
  }
  return ig;
}
