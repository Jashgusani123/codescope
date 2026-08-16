import { readdir } from "node:fs/promises";
import path from "node:path";
import { SUPPORTED_EXTENSIONS } from "./config.js";

export async function walkDir(dir, ig, rootDir, collected = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath).split(path.sep).join("/");

    if (ig.ignores(relPath)) continue;

    if (entry.isDirectory()) {
      await walkDir(fullPath, ig, rootDir, collected);
    } else {
      const ext = path.extname(entry.name);
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        collected.push(fullPath);
      }
    }
  }

  return collected;
}
