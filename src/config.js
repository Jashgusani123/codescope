export const EMBED_MODEL = "snowflake-arctic-embed";
export const CHAT_MODEL = "llama3.2";
export const DB_DIR = "./.codescope/database";
export const CACHE_FILE = "./.codescope/file-hashes.json";

export const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "package-lock.json",
  "yarn.lock",
  ".codescope",
];

// snowflake-arctic-embed's context is small (~512 tokens). Code tokenizes
// much denser than plain English, so keep this conservative.
export const MAX_CHUNK_CHARS = 900;

// Files with a tree-sitter grammar — parsed into real function/class chunks.
export const CODE_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"];

// Files without a tree-sitter grammar available — still indexed, but as
// raw text chunks rather than AST-extracted functions. Covers common
// frontend (HTML/CSS) and beginner-friendly (Python) file types.
export const PLAIN_TEXT_EXTENSIONS = [".html", ".htm", ".css", ".scss", ".md", ".py"];

export const SUPPORTED_EXTENSIONS = [...CODE_EXTENSIONS, ...PLAIN_TEXT_EXTENSIONS];

export const CHUNK_NODE_TYPES = new Set([
  "function_declaration",
  "method_definition",
  "arrow_function",
]);
