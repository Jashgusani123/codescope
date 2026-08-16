# codescope

**Understand any codebase from your terminal — fully offline.**

`codescope` scans a local project, parses its functions and classes with `tree-sitter`, embeds them, and stores everything in a local vector database. Then you can ask plain-English questions about the code and get grounded, source-cited answers — all powered by local models through Ollama. No API keys, no cloud calls, no source code ever leaves your machine.

---

## Features

- 🔍 Understands code structure (functions, classes, methods) — not just raw text
- 🧠 Answers questions using retrieval, not guessing — every answer cites the file and line numbers it came from
- 🔒 100% local — no API key, no data leaves your device
- ⚡ Incremental re-indexing — only re-embeds files that changed since the last run
- 🎯 Scope to a folder — index just `./src/auth` instead of the whole repo

---

## Prerequisites

1. **Node.js** v18 or newer
2. **[Ollama](https://ollama.com)** installed and running locally
3. Pull the two models `codescope` uses:
   ```bash
   ollama pull snowflake-arctic-embed
   ollama pull llama3.2
   ```

> ⚠️ If Ollama isn't running, `codescope init` and `codescope ask` will fail with a connection error — see Debugging below.

---

## Install

```bash
npm install -g @jashg91/codescope
```

Or, running from source:
```bash
git clone https://github.com/Jashgusani123/codescope.git
cd codescope
npm install
npm link
```

---

## Usage

**Index a project:**
```bash
cd your-project
codescope init
```

**Index only a specific folder:**
```bash
codescope init ./src/auth
```

**Ask a question:**
```bash
codescope ask "How does authentication work?"
codescope ask "Is there a function for addition?"
```

Re-running `codescope init` later only re-embeds files that changed — safe to run again anytime after editing code.

---

## How it works

1. **Scan** — walks the target folder, respecting `.gitignore` plus sane defaults (`node_modules`, `.git`, `dist`, etc.)
2. **Parse** — uses `tree-sitter` to extract real code units (functions, classes, methods) instead of arbitrary line chunks
3. **Embed** — sends each chunk to a local Ollama embedding model (`snowflake-arctic-embed`)
4. **Store** — saves vectors in a local file-based database (LanceDB) inside `.codebase-agent/database` — never synced anywhere
5. **Retrieve** — on `ask`, embeds your question and finds the most similar code chunks
6. **Answer** — sends those chunks + your question to a local chat model (`llama3.2`), which answers using only that retrieved context

---

## Currently supported

**Fully AST-parsed** (functions, classes, methods, and API routes extracted individually):
- ✅ `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`

**Text-indexed** (whole file chunked and searchable, no function-level extraction):
- ✅ `.html`, `.htm`, `.css`, `.scss`, `.md`, `.py`

Covers a typical MERN project end to end — React frontend, Express/Node backend, HTML templates, CSS, and docs. Other file types are currently skipped.

---

## Debugging

**`Error: connect ECONNREFUSED` or similar on `init`/`ask`**
Ollama isn't running. Start it, then confirm the models are pulled:
```bash
ollama list
```
You should see `snowflake-arctic-embed` and `llama3.2` in the output.

**`No index found. Run 'codescope init' first.`**
You ran `ask` before `init` in this project folder, or `.codebase-agent/database` was deleted. Run `codescope init` again.

**`the input length exceeds the context length`**
A code chunk is too large for the embedding model. `codescope` retries with progressively smaller slices automatically and skips a chunk if it truly can't fit — you'll see a `⚠ Skipping "..."` warning naming the exact function. This doesn't stop the rest of indexing.

**`Extracted 0 code chunks`**
Either the folder has no `.js/.jsx/.ts/.tsx` files, or everything in it is being excluded by `.gitignore` / default ignores. Double check the path you passed to `init`.

**Answers seem wrong or mismatched (e.g. wrong function name in the answer)**
`llama3.2` is a small local model and can occasionally mislabel things in its written answer even when retrieval was correct — check the **Sources** list under the answer, which always reflects the real chunk metadata (file + line numbers), not the model's prose.

**`npm install` fails with a `node-gyp` error (Windows)**
`tree-sitter` compiles native code. Install Python and "Visual Studio Build Tools" (C++ workload), then retry `npm install`. Mac/Linux rarely hit this.

**Accidentally committed `.codebase-agent/` to git**
It's already in `.gitignore` going forward — if it was committed before adding this tool, remove it with `git rm -r --cached .codebase-agent` and commit.

---

## License

MIT
