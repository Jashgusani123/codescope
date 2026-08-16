import path from "node:path";
import { MAX_CHUNK_CHARS } from "./config.js";

// For files without a tree-sitter grammar (HTML, CSS, Python, Markdown, etc.)
// we can't extract "functions" — there's no AST. Instead, split the raw
// content into readable chunks by line boundaries so it's still searchable,
// rather than silently skipping the file entirely.
export function chunkPlainText(sourceCode, filePath) {
  const lines = sourceCode.split("\n");
  const chunks = [];
  let currentLines = [];
  let currentLen = 0;
  let startLine = 1;

  function flush(endLineIndex) {
    if (currentLines.length === 0) return;
    chunks.push({
      name: `${path.basename(filePath)}_part_${chunks.length + 1}`,
      type: "text_block",
      file: filePath,
      code: currentLines.join("\n"),
      startLine,
      endLine: endLineIndex,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (currentLen + line.length + 1 > MAX_CHUNK_CHARS && currentLines.length > 0) {
      flush(startLine + currentLines.length - 1);
      startLine = i + 1;
      currentLines = [];
      currentLen = 0;
    }
    currentLines.push(line);
    currentLen += line.length + 1;
  }
  flush(startLine + currentLines.length - 1);

  return chunks;
}
