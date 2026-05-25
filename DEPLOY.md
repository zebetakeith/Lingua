# Deploying Lexicon Labyrinth

This app builds to static files in `dist`, so it can be hosted on Netlify, Vercel, Cloudflare Pages, or similar static hosts.

## Recommended Setup

Use GitHub plus a static host:

1. Push this project to a GitHub repository.
2. Connect the repository to Netlify, Vercel, or Cloudflare Pages.
3. Use these settings:
   - Build command: `npm run build`
   - Publish/output directory: `dist`
   - Root directory: this `app` folder if the repo root is `LanguageRoguelite`

After that, every push creates a new hosted build and usually a preview URL.

## GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml`, which publishes `dist` to GitHub Pages on every push to `main`.

For a public GitHub repo named `language-roguelite`, the URL will usually be:

```text
https://YOUR_USERNAME.github.io/language-roguelite/
```

If the first workflow asks for Pages setup, open the repository settings, go to Pages, and choose GitHub Actions as the source.

## Quick Manual Deploy

For a one-off test, run:

```bash
npm run build
```

Then upload the `dist` folder to a static host that supports manual deploys.

## Save Data Note

The hosted URL makes the game available from any device, but saves are still stored per browser for now. Use the in-game Backup & Restore controls to move decks and progress between devices until cloud sync is added.
