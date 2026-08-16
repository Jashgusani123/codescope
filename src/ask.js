import ora from "ora";
import chalk from "chalk";
import ollama from "ollama";
import * as lancedb from "@lancedb/lancedb";
import { getEmbedding } from "./embeddings.js";
import { DB_DIR, CHAT_MODEL } from "./config.js";

async function askLLM(question, context) {
  const response = await ollama.chat({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an AI code assistant.
Answer ONLY using the provided code context.
Always mention which file(s) your answer is based on.
If the answer cannot be found in the context, reply exactly:
"I couldn't find the answer in the indexed repository."`,
      },
      {
        role: "user",
        content: `Repository Context:\n\n${context}\n\nQuestion:\n\n${question}`,
      },
    ],
  });

  return response.message.content;
}

function wrapLine(line, width) {
  if (line.length <= width) return [line];
  const words = line.split(" ");
  const wrapped = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      wrapped.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) wrapped.push(current);
  return wrapped;
}

// Splits the answer into alternating prose / code segments based on ``` fences.
function splitAnswerSegments(answer) {
  const parts = answer.split("```");
  return parts.map((text, i) => ({
    type: i % 2 === 0 ? "prose" : "code",
    text: i % 2 === 1 ? text.replace(/^\w*\n/, "") : text, // strip language tag line
  }));
}

function printAnswerBox(question, answer, sources) {
  const width = Math.max(60, Math.min((process.stdout.columns || 100) - 4, 140));
  const divider = chalk.dim("─".repeat(width));

  console.log("");
  console.log(chalk.bold.cyan("❓ " + question));
  console.log(divider);

  const segments = splitAnswerSegments(answer);
  for (const segment of segments) {
    if (segment.type === "code") {
      const codeLines = segment.text.replace(/\n$/, "").split("\n");
      console.log("");
      codeLines.forEach((l) => console.log(chalk.yellow("  " + l)));
      console.log("");
    } else {
      segment.text
        .split("\n")
        .filter((l) => l.trim() !== "")
        .forEach((l) => {
          wrapLine(l, width).forEach((wrapped) => console.log(wrapped));
        });
    }
  }

  console.log(divider);
  console.log(chalk.dim.bold("Sources:"));
  sources.forEach((s) => {
    console.log(chalk.dim(`  - ${s.file} (lines ${s.startLine}-${s.endLine}) [${s.name}]`));
  });
  console.log("");
}

export async function runAsk(question) {
  if (!question) {
    console.log(chalk.red("Usage: codescope ask \"<your question>\""));
    return;
  }

  let spinner = ora("Loading index...").start();
  let db, table;
  try {
    db = await lancedb.connect(DB_DIR);
    table = await db.openTable("functions");
  } catch {
    spinner.fail("No index found. Run 'codescope init' first.");
    return;
  }
  spinner.succeed("Index loaded.");

  spinner = ora("Searching relevant code...").start();
  const questionEmbedding = await getEmbedding(question, "user question");
  const results = await table.search(questionEmbedding).limit(5).toArray();
  spinner.succeed(`Found ${results.length} relevant code chunks.`);

  const context = results
    .map(
      (item) =>
        `File: ${item.file} (lines ${item.startLine}-${item.endLine})\nName: ${item.name}\n\n${item.code}`
    )
    .join("\n-------------------------\n");

  spinner = ora("Thinking...").start();
  const answer = await askLLM(question, context);
  spinner.succeed("Done.");

  printAnswerBox(question, answer, results);
}
