import { readFile } from "node:fs/promises";
import path from "node:path";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import { CHUNK_NODE_TYPES, PLAIN_TEXT_EXTENSIONS } from "./config.js";
import { chunkPlainText } from "./plainTextChunker.js";

const PARSERS_BY_EXT = {
  ".js": JavaScript,
  ".jsx": JavaScript,
  ".mjs": JavaScript,
  ".cjs": JavaScript,
  ".ts": TypeScript.typescript,
  ".tsx": TypeScript.tsx,
};

const HTTP_METHODS = new Set(["get", "post", "put", "delete", "patch", "use", "all"]);

function isRouteCall(node) {
  if (node.type !== "call_expression") return false;
  const callee = node.childForFieldName("function");
  if (!callee || callee.type !== "member_expression") return false;
  const property = callee.childForFieldName("property")?.text;
  const object = callee.childForFieldName("object")?.text;
  return object && property && HTTP_METHODS.has(property);
}

function extractChunksFromTree(rootNode, filePath) {
  const chunks = [];

  function makeChunk(node, nameOverride) {
    const name =
      nameOverride ||
      node.childForFieldName("name")?.text ||
      node.parent?.childForFieldName("name")?.text ||
      `${node.type}_at_line_${node.startPosition.row + 1}`;

    return {
      name,
      type: node.type,
      file: filePath,
      code: node.text,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
    };
  }

  function visit(node) {
    // Route registrations: router.post("/join", ..., joinWorkspace) etc.
    // These are call expressions, not function definitions, so they need
    // their own detection — otherwise "what's the endpoint for X" can
    // never be answered, even if the handler function itself is indexed.
    if (isRouteCall(node)) {
      const callee = node.childForFieldName("function");
      const method = callee.childForFieldName("property")?.text;
      const object = callee.childForFieldName("object")?.text;
      const args = node.childForFieldName("arguments");
      const pathArg = args?.namedChildren?.find((a) => a.type === "string");
      const path = pathArg ? pathArg.text.replace(/['"]/g, "") : "?";

      chunks.push(makeChunk(node, `ROUTE ${method.toUpperCase()} ${path} (${object})`));
      return; // don't descend — avoid double-capturing inline handlers separately
    }

    // Classes: split into individual methods for finer-grained retrieval.
    if (node.type === "class_declaration") {
      const className = node.childForFieldName("name")?.text || "AnonymousClass";
      let methodCount = 0;
      for (const child of node.namedChildren) {
        if (child.type === "class_body") {
          for (const member of child.namedChildren) {
            if (member.type === "method_definition") {
              methodCount++;
              const methodName = member.childForFieldName("name")?.text || "method";
              chunks.push(makeChunk(member, `${className}.${methodName}`));
            }
          }
        }
      }
      if (methodCount === 0) {
        chunks.push(makeChunk(node, className));
      }
      return;
    }

    if (CHUNK_NODE_TYPES.has(node.type)) {
      // Always capture the full chunk, regardless of size. Size limits
      // are only handled later, at embedding time — never here, or
      // oversized functions get silently dropped from the index entirely.
      chunks.push(makeChunk(node));
      return;
    }

    for (const child of node.namedChildren) {
      visit(child);
    }
  }

  visit(rootNode);
  return chunks;
}

export async function parseFile(filePath) {
  const ext = path.extname(filePath);
  const sourceCode = await readFile(filePath, "utf-8");

  const grammar = PARSERS_BY_EXT[ext];
  if (grammar) {
    const parser = new Parser();
    parser.setLanguage(grammar);
    const tree = parser.parse(sourceCode);
    return extractChunksFromTree(tree.rootNode, filePath);
  }

  if (PLAIN_TEXT_EXTENSIONS.includes(ext)) {
    return chunkPlainText(sourceCode, filePath);
  }

  return []; // genuinely unsupported file type
}
