# Clawdmeter for DeskThing

Live Claude Code session and weekly usage meters with a mood-driven splash, ported from the [Clawdmeter](https://github.com/HermannBjorgvin/Clawdmeter) ESP32 dashboard to the [Spotify Car Thing](https://github.com/ItsRiprod/DeskThing) running on the DeskThing platform.

This is a **scaffold** — usage polling, mascot animations, and host-keystroke actions land in subsequent phases. See `CLAUDE.md` (local, gitignored) for the full design brief and `CHANGELOG.md` for what has shipped.

## Purpose

- Show Claude Code session and weekly utilisation on the Car Thing's 800×480 display.
- Surface reset countdowns and rate-limit status without leaving the dashboard.
- Provide two host-keystroke actions (push-to-talk, mode toggle) bindable via DeskThing's mappings UI.
- Run entirely through the DeskThing server/client architecture — no BLE, no systemd, no proprietary assets.

## Setup

```bash
npm install
npm run dev        # starts the DeskThing dev wrapper + Vite client
```

Build a loadable bundle:

```bash
npm run build      # writes dist/<appId>.zip via @deskthing/cli package
```

Typecheck only (no build):

```bash
npm run typecheck  # runs the client and server tsconfig projects
```

## Usage

1. Install Claude Code on the host and log in once so `~/.claude/.credentials.json` exists.
2. Install the built zip into your DeskThing server.
3. Open the Clawdmeter settings panel and confirm the credentials path resolves.
4. Map physical Car Thing buttons to `clawd:voice_ptt` and `clawd:mode_toggle` in the DeskThing mappings UI (available once Phase 4 lands).

## Troubleshooting

- **No usage updates:** check the credentials path in settings and confirm `~/.claude/.credentials.json` exists on the host. Server logs are prefixed `[Clawdmeter Server]`.
- **HTTP 429:** the server backs off exponentially up to `pollIntervalSec × 8`. Raise the poll interval if you hit this often.
- **Mappings don't fire:** confirm the actions appear in the DeskThing mappings UI; on builds without host-keystroke dispatch, only the in-app actions will work.

## Licensing

Code: Apache-2.0 (see `LICENSE`). Bundled assets follow their own licences — no Anthropic proprietary fonts and no Clawd mascot art ship in this repo. See `LICENSING.md` once Phase 7 lands.
