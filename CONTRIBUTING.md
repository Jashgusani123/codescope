# Contributing to codescope

Thanks for considering a contribution! This is a small, young project — contributions of any size are welcome.

## Setup

```bash
git clone https://github.com/Jashgusani123/codescope.git
cd codescope
npm install
npm link
```

Make sure [Ollama](https://ollama.com) is running locally with `snowflake-arctic-embed` and `llama3.2` pulled, since the CLI depends on both.

## Making changes

1. Fork the repo and create a branch for your change.
2. Test locally with `npm link` — this points your global `codescope` command at your local code, so you can run `codescope init` / `codescope ask` on a real project to verify changes.
3. Open a PR with a short description of what changed and why.

## Good first areas to contribute

- Additional language support (tree-sitter grammars for Python, Go, etc.)
- Better HTML/CSS chunking (currently raw-text fallback, not AST-aware)
- Detecting deleted files and pruning stale chunks from the vector DB
- Support for more router patterns (chained `.route().get().post()`, custom wrappers)

## Reporting bugs

Open an issue with: what you ran, what you expected, what actually happened, and your OS/Node version. If it's a parsing bug, a small code snippet that reproduces it is extremely helpful.