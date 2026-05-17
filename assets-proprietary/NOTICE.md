# Proprietary Assets — NOT OPEN-SOURCE

Files under this directory are **third-party copyrighted material** redistributed in this fork **without explicit permission**.

## What's here

- `clawd/` — Clawd pixel-art sprite data (palette + grid JSON, 13 animations) originally hosted at https://claudepix.vercel.app and ingested by the upstream Clawdmeter project (https://github.com/HermannBjorgvin/Clawdmeter).
  - **Copyright holders:** Anthropic, PBC and `@amaanbuilds` on X.
  - **License terms:** none granted to redistributors; the upstream Clawdmeter project explicitly flags this as a gray area in its own LICENSING notes.

## Why this directory exists

This DeskThing port deliberately separates proprietary assets from the Apache-2.0-licensed code in `src/`, `server/`, `shared/`, `tests/`, and the rest of the repo. Everything outside `assets-proprietary/` is original work by AI-Flow NOWAK and contributors, redistributable under Apache-2.0.

## Why you may NOT have these files

`assets-proprietary/` is `.gitignore`d at the repository root. If you cloned a public mirror of this repo and this directory is empty, that is by design — the proprietary assets do not ship with the repo.

To restore them for personal use, run the upstream scraper (`tools/scrape_claudepix.js` in `HermannBjorgvin/Clawdmeter`) yourself and drop the resulting JSON files into `assets-proprietary/clawd/`. The build will pick them up automatically; if the directory is empty the app falls back to the original "Pip" SVG mascot.

## Do NOT

- Do **not** commit this directory's contents to a public Git remote.
- Do **not** include this directory's contents in distributed binaries (zips, container images, app-store builds) that you redistribute to third parties.
- Do **not** use Anthropic's "Claude" wordmark or logo alongside these sprites in any user-facing context.

## If you are Anthropic / `@amaanbuilds`

If you are a rights holder and want these assets removed from this fork, contact `t.nowak@ai-flow.no`. The files will be deleted from this local working copy immediately on request, and the build will continue working with the Pip fallback.
