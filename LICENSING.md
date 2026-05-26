# Licensing

## Summary — Apache-2.0 across the board

As of **v0.4.0**, this project is licensed uniformly under the **Apache License 2.0** for every file shipped in the build:

- Code: `server/`, `src/`, `shared/`, `tests/`, `scripts/`
- Mascot sprites: `assets/mascot/*.json` — 17 original 20×20 pixel-art animations + `_index.json`
- Manifest, app icon, configuration files

See `LICENSE` for the full Apache-2.0 text. Built ZIPs (`dist/claude-status-deskthing-v*.zip`) are freely redistributable.

This is a clean break from the v0.3.x private-fork era, when the bundled mascot art was sourced from a third-party fan repository with unclear redistribution rights. That entire dependency was removed in v0.4.0.

## What changed in v0.4.0

The upstream [Clawdmeter](https://github.com/HermannBjorgvin/Clawdmeter) ESP32 dashboard that inspired this DeskThing port bundled assets whose redistribution rights were unclear — Anthropic-proprietary fonts (Tiempos Text, Styrene B) and Clawd mascot pixel-art scraped from a fan site. The upstream author flagged this explicitly. **This port has now resolved the issue:**

- **All code** is original work by AI-Flow NOWAK and contributors, released under Apache-2.0.
- **Mascot art** is an original orange robot — 20×20 pixel-art procedurally emitted by `scripts/sprite-pipeline/`. Every byte of palette and grid data is ours.
  - Anatomy was **inspired by** Foozle's CC0 "Cute Platformer Robot" (round head, antenna, screen-face with two eyes, body, arms, legs). Foozle's pack itself ships under CC0 and was used only as a reference for proportions — none of its pixel data, frames, or sprite sheets appear in this repo's build output.
  - The seventeen animation choreographies (idle×6, expressions×3, work×2, dance×5, archive×1) and the Anthropic-orange palette are our own design.
- **Fonts**: no proprietary fonts ship in this repo. Tailwind tokens reference `Inter` and `JetBrains Mono` family names with a graceful fallback to `system-ui` / `ui-monospace`.
- **Anthropic branding**: this is a third-party tool that reads the Anthropic API's rate-limit response headers. No Anthropic wordmark, logo, or brand fonts appear anywhere in the UI text or chrome.

## Bundled asset inventory

### Apache-2.0 (original work, freely redistributable)

| Path | Origin |
| --- | --- |
| `server/`, `src/`, `shared/`, `tests/` | Original code authored for this port. |
| `scripts/sprite-pipeline/robot-base.mjs` | Original — BASE_NEUTRAL pose, palette, and composer helpers (eyes, antenna, sway, bounce, expressions). |
| `scripts/sprite-pipeline/generate-robot-sprites.mjs` | Original — emits all 17 mascot JSON sprites + `_index.json`. |
| `scripts/sprite-pipeline/inspect.mjs`, `analyze-style.mjs` | Original diagnostic utilities. |
| `assets/mascot/*.json` (17 sprites + `_index.json`) | Original 20×20 pixel-art robot animations. Every palette colour and grid cell defined in `generate-robot-sprites.mjs`. |
| `deskthing/manifest.json` | Original app manifest. |
| `src/components/MeterMascot.tsx` | Original "Pip" SVG mascot — currently dormant; kept as a legacy alternate. |
| `LICENSE`, `LICENSING.md`, `README.md`, `CHANGELOG.md` | Original prose. |

### Reference material (not bundled, gitignored)

| Path | Origin / Rights |
| --- | --- |
| `assets-staging/foozle-original/` | Foozle "Cute Platformer Robot" CC0 pack, used as anatomy reference during the v0.4.0 mascot redesign. Re-downloadable from https://foozlecc.itch.io/cute-platformer-robot. Not bundled in builds and not tracked in git. |

## Mascot attribution (optional, voluntary)

Foozle's CC0 licence does not require attribution, but the anatomy reference deserves a polite hat-tip:

> Robot anatomy inspired by Foozle's CC0 "Cute Platformer Robot" — https://foozlecc.itch.io/cute-platformer-robot

## Third-party dependencies

Runtime dependencies pulled from npm at install time keep their own licences. The notable ones:

- `@deskthing/server`, `@deskthing/client`, `@deskthing/cli`, `@deskthing/types` — see each package's `LICENSE` in `node_modules/`.
- `react`, `react-dom` — MIT.
- `vite`, `@vitejs/plugin-react`, `vitest` — MIT.
- `tailwindcss`, `postcss`, `autoprefixer` — MIT.
- `typescript`, `eslint`, `typescript-eslint`, `eslint-plugin-react-*`, `globals` — MIT/Apache-2.0.
- `pngjs` (used only by the offline sprite pipeline, not bundled into the app) — MIT.

None of the npm dependencies are bundled into the source tree; they are resolved into `node_modules/` (gitignored) and, where appropriate, bundled into `dist/` at build time.

## Going public

The repository can now be made public without further licence redaction. The build pipeline produces a self-contained Apache-2.0 bundle with no third-party-encumbered content.
