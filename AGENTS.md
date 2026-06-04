# Codex Working Guide

This repo is a browser game project. Work carefully and narrowly so Codex stays fast and the project stays easy to understand.

## Main Rules

- Work narrowly.
- Inspect only files relevant to the current task.
- Do not inspect large asset folders unless explicitly asked.
- Do not run builds, previews, imports, or full tests unless explicitly asked.
- Prefer small edits.
- Before making a big change, explain the plan simply.
- Keep explanations beginner-friendly.

## What To Avoid Unless Asked

- Do not scan the whole repo.
- Do not read `node_modules/`.
- Do not read `dist/` unless checking a published build artifact was specifically requested.
- Do not browse large image, screenshot, recording, export, cache, or generated-asset folders.
- Do not start a dev server, production build, asset import, or full test suite without asking first.
- Do not delete files.
- Do not move important files without asking first.

## Efficient Workflow

1. Start with the smallest useful folder or file list.
2. Use targeted searches inside `src/` or a named folder.
3. Read only the files needed for the task.
4. Make the smallest safe change.
5. Explain what changed in plain English.

## Important Project Areas

- `src/`: main game code.
- `src/experiments/`: prototype and lab screens, including the Blob Tactics experiment.
- `src/game/`: shared game rules and study/progression logic.
- `public/`: shipped browser assets. Inspect only the specific asset paths needed.
- `docs/`: planning notes and project documentation.
- `dist/`: generated build output. Usually ignore.
- `node_modules/`: installed dependencies. Always ignore unless the user explicitly asks.
