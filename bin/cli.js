#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "../src/init.js";
import { runAsk } from "../src/ask.js";

const program = new Command();

program
  .name("codescope")
  .description("AI-powered local codebase indexing and Q&A")
  .version("1.0.0");

program
  .command("init")
  .description("Scan, parse, embed, and store the codebase (or a specific folder)")
  .argument("[path]", "path to scan", "./")
  .action(async (path) => {
    await runInit(path);
  });

program
  .command("ask")
  .description("Ask a question about the indexed codebase")
  .argument("<question>", "your question")
  .action(async (question) => {
    await runAsk(question);
  });

program.parse();
