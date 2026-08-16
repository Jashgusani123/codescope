import { readFile } from "node:fs/promises";
import path from "node:path";
import ora from "ora";
import chalk from "chalk";
import * as lancedb from "@lancedb/lancedb";
import { loadIgnoreRules } from "./ignoreRules.js";
import { walkDir } from "./walk.js";
import { parseFile } from "./parser.js";
import { getEmbedding } from "./embeddings.js";
import { loadCache, saveCache, hashContent } from "./cache.js";
import { DB_DIR } from "./config.js";

export async function runInit(targetPath = "./") {
  console.log(chalk.bold.cyan("\n📦 codescope init\n"));

  // --- Stage 1: Scan files ---
  let spinner = ora("Scanning files...").start();
  const ig = await loadIgnoreRules(targetPath);
  const files = await walkDir(targetPath, ig, targetPath);
  spinner.succeed(`Found ${chalk.bold(files.length)} source files.`);

  if (files.length === 0) {
    console.log(chalk.yellow("Nothing to index. Check your path or ignore rules."));
    return;
  }

  // --- Stage 2: Check cache, decide what changed ---
  spinner = ora("Checking for changed files...").start();
  const cache = await loadCache();
  const newCache = {};
  const filesToReparse = [];

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const hash = hashContent(content);
    newCache[file] = hash;
    if (cache[file] !== hash) {
      filesToReparse.push(file);
    }
  }

  const unchangedCount = files.length - filesToReparse.length;
  spinner.succeed(
    `${chalk.bold(filesToReparse.length)} changed, ${chalk.dim(unchangedCount + " unchanged")}.`
  );

  if (filesToReparse.length === 0) {
    console.log(chalk.green("\n✔ Everything already indexed. Nothing to do.\n"));
    return;
  }

  // --- Stage 3: Parse into chunks ---
  spinner = ora("Parsing code into functions/classes...").start();
  const allChunks = [];
  for (const file of filesToReparse) {
    const chunks = await parseFile(file);
    allChunks.push(...chunks);
  }
  spinner.succeed(`Extracted ${chalk.bold(allChunks.length)} code chunks.`);

  if (allChunks.length === 0) {
    console.log(chalk.yellow("No functions/classes found in changed files."));
    await saveCache(newCache);
    return;
  }

  // --- Stage 4: Generate embeddings (live progress) ---
  spinner = ora(`Generating embeddings (0/${allChunks.length})...`).start();
  const data = [];
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    spinner.text = `Generating embeddings (${i + 1}/${allChunks.length})...`;
    const embedding = await getEmbedding(chunk.code, `${chunk.file}:${chunk.name}`);
    if (!embedding) continue;
    data.push({
      id: crypto.randomUUID(),
      name: chunk.name,
      type: chunk.type,
      file: chunk.file,
      code: chunk.code,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      vector: embedding,
    });
  }
  spinner.succeed(`Embedded ${chalk.bold(data.length)} chunks.`);

  // --- Stage 5: Store in LanceDB ---
  spinner = ora("Storing in local vector database...").start();
  const db = await lancedb.connect(DB_DIR);

  let table;
  const existingTables = await db.tableNames();
  if (existingTables.includes("functions") && unchangedCount > 0) {
    // merge: keep old unchanged entries, add new ones
    table = await db.openTable("functions");
    if (data.length > 0) await table.add(data);
  } else {
    table = await db.createTable("functions", data, { mode: "overwrite" });
  }
  spinner.succeed("Stored in vector database.");

  await saveCache(newCache);

  console.log(chalk.bold.green(`\n✔ Index ready. ${data.length} chunks embedded this run.\n`));
  console.log(chalk.dim(`Try: codescope ask "your question here"\n`));
}
