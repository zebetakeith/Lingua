# Project Map

This file is a simple map for Codex and for non-programmer navigation. It explains what is important and what should usually be avoided to keep work fast and safe.

## Important Folders

### `src/`

The main game code lives here. Most future gameplay, UI, study-system, and combat changes should happen somewhere inside this folder.

### `src/experiments/`

Historical experiments and the production Goo Keep screen live here. Pipplo's Goo Keep is now the primary castle-versus-castle game mode.

Use this folder when working on lane combat, live study pressure, castle progression, game UI, or Goo Keep presentation.

### `src/game/`

Shared game rules live here. This is where study logic, card progress, party/combat definitions, and reusable game systems are likely to be.

Use this folder when changing how flashcards, progression, mastery, or shared combat rules work.

### `public/`

Browser assets live here, such as images used by the app.

This folder can become large, so Codex should inspect only the specific asset path needed for a task. Do not browse the whole folder casually.

### `docs/`

Planning notes and project documentation live here.

This is a good place for design plans, project summaries, and handoff notes.

### `.github/`

GitHub workflow and publishing-related files may live here.

Only inspect this when working on deployment or GitHub automation.

## Folders Codex Should Usually Avoid

### `node_modules/`

Installed dependency files. This folder is large and should not be read during normal work.

### `dist/`

Generated production build output. This folder is created by builds and should usually be ignored.

### Possible Local-Only Folders

These folders may appear later and should usually be avoided unless the user specifically asks:

- `screenshots/`
- `recordings/`
- `captures/`
- `exports/`
- `tmp/`
- `temp/`
- `raw-assets/`
- `source-assets/`
- `reference-images/`
- `generated-assets/`
- `asset-sources/`

These are useful places to store bulky local material, but they can make Codex slow if scanned.

## Top-Level Files

- `package.json`: lists scripts and app dependencies.
- `package-lock.json`: dependency lock file. It is big; do not read it unless necessary.
- `vite.config.ts`: browser build configuration.
- `README.md`: general project notes.
- `DEPLOY.md`: deployment notes.
- `.gitignore`: tells Git which generated or local files to ignore.
- `AGENTS.md`: tells Codex how to work efficiently in this repo.

## Safe Codex Habits

- Look at the smallest relevant area first.
- Avoid recursive scans unless there is a clear reason.
- Avoid large folders and generated files.
- Ask before running builds, previews, imports, or full tests.
- Ask before moving important files.
- Never delete files unless the user clearly asks.
