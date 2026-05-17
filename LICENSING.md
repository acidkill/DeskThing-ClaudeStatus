# Licensing

## Code

This project is licensed under the **Apache License 2.0**. See `LICENSE` for the full text.

## What changed from upstream Clawdmeter

The upstream [Clawdmeter](https://github.com/HermannBjorgvin/Clawdmeter) repository bundles assets whose redistribution rights are unclear — Anthropic-proprietary fonts (Tiempos Text, Styrene B) and Clawd mascot pixel-art scraped from a fan site. The upstream author flags this explicitly. **This port does not perpetuate that.** Concrete differences:

- **Mascot.** This repo ships an original mascot called **Pip** — a cyan/teal capsule character with cheeks, eye-blink, body-breath, and a tiny swinging gauge needle. Hand-authored from geometric primitives in `src/components/MeterMascot.tsx` (in-app) and `deskthing/icons/clawdmeter.svg` (app icon). Distinct in shape, palette, and motif from Clawd; no derivative-work intent.
- **Fonts.** No proprietary fonts ship in this repo. Tailwind tokens reference `Inter` and `JetBrains Mono` family names with a graceful fallback to `system-ui` / `ui-monospace`, so if those fonts are installed on the host the UI uses them, otherwise the OS default is used. Self-hosting open-licence Inter + JetBrains Mono WOFF2 under `public/fonts/` is a planned follow-up.
- **Anthropic branding.** This is a third-party tool that reads the Anthropic API's rate-limit response headers. No Anthropic wordmark, logo, or brand fonts appear anywhere in the UI, the app icon, or the bundled assets.

## Bundled asset inventory

| Path                                        | Licence       | Origin                                                                                    |
| ------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `deskthing/icons/clawdmeter.svg`            | Apache-2.0    | Original SVG of the Pip mascot, hand-authored for this repo.                              |
| `src/components/MeterMascot.tsx` (SVG markup) | Apache-2.0  | Original mascot rendered as React SVG, hand-authored for this repo.                       |
| `deskthing/manifest.json`                   | Apache-2.0    | Original.                                                                                  |
| Code under `server/`, `src/`, `shared/`, `tests/` | Apache-2.0 | Original.                                                                                  |

No third-party fonts, sprite sheets, audio files, or pre-built binaries are bundled in this repo.

## Third-party dependencies

Runtime dependencies pulled from npm at install time keep their own licences. The notable ones:

- `@deskthing/server`, `@deskthing/client`, `@deskthing/cli`, `@deskthing/types` — see each package's `LICENSE` in `node_modules/`.
- `react`, `react-dom` — MIT.
- `vite`, `@vitejs/plugin-react`, `vitest` — MIT.
- `tailwindcss`, `postcss`, `autoprefixer` — MIT.
- `typescript`, `eslint`, `typescript-eslint`, `eslint-plugin-react-*`, `globals` — MIT/Apache-2.0.

None of these are bundled into the source tree; they are resolved into `node_modules/` (gitignored) and, where appropriate, bundled into `dist/` at build time.

## If you want to use the upstream Clawd mascot

`assets-proprietary/` is gitignored. Drop user-supplied sprites there and the client picks them up automatically. That keeps any redistribution-restricted asset out of the public commit history.

### Opt-in Clawd sprite bundle (personal use only)

For local forks where the owner accepts the licensing risk, this repo can optionally bundle the original Clawd pixel-art sprites under `assets-proprietary/clawd/`. When present, `src/clawd/sprites.ts` picks them up via a Vite glob and `src/clawd/ClawdSprite.tsx` renders them on a `<canvas>` instead of the Pip SVG fallback.

| Path                                | Licence                              | Origin                                                                                       |
| ----------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `assets-proprietary/NOTICE.md`      | Apache-2.0 (prose)                   | Original notice authored for this repo describing the proprietary directory.                 |
| `assets-proprietary/clawd/*.json`   | **Third-party, no licence granted**  | Clawd pixel-art sprite data scraped from https://claudepix.vercel.app via the upstream Clawdmeter project's `tools/scrape_claudepix.js`. Copyright Anthropic, PBC and `@amaanbuilds`. |

**Constraints for opt-in users:**

- These files **must not** be committed to a public Git remote. The repo's `.gitignore` already blocks `assets-proprietary/` to enforce this.
- Distributed `.zip` bundles built with these sprites bundled are for **personal use** only. Do not redistribute the bundle to third parties.
- If a rights holder requests removal, delete `assets-proprietary/clawd/` from your working copy. The build continues to work — `hasClawdSprites()` returns `false` and the UI falls back to the original Pip mascot.

See `assets-proprietary/NOTICE.md` for the full notice. If the directory is empty (default state after a fresh clone), nothing changes — the app ships with Pip.
