# Clawdmeter for DeskThing

Live Claude Code session and weekly usage meters with a mood-driven splash, ported from the [Clawdmeter](https://github.com/HermannBjorgvin/Clawdmeter) ESP32 dashboard to the [Spotify Car Thing](https://github.com/ItsRiprod/DeskThing) running on the DeskThing platform.

## Purpose

- Show Claude Code session (5h) and weekly (7d) utilisation on the Car Thing's 800×480 display.
- Surface reset countdowns and rate-limit status without leaving the dashboard.
- Drive an original mood-aware mascot ("Pip") whose animation intensity scales with how fast the meter is climbing.
- Register host-keystroke actions (push-to-talk, mode toggle) bindable via DeskThing's mappings UI.
- Run entirely through the DeskThing server/client architecture — no BLE, no systemd, no proprietary assets.

## Architecture

```
+-----------------+              +---------------------+              +-----------------+
|   Car Thing     |   typed JSON |   DeskThing server  |   HTTPS      |  Anthropic API  |
|  client (React) | <----------> |  (Node, this repo)  | -----------> |  /v1/messages   |
|  src/           |              |  server/index.ts    |              +-----------------+
|                 |              |  poll loop          |
|                 |              |  registers actions  |              +-----------------+
|                 |              |  reads creds        | <----------- | ~/.claude/      |
+-----------------+              +---------------------+              |  .credentials   |
                                                                       +-----------------+
```

- **Server** (`server/`, Node) is the only network caller. It reads the Claude Code OAuth token from disk, pings `POST https://api.anthropic.com/v1/messages` with a one-token Haiku call once per `pollIntervalSec`, parses the `anthropic-ratelimit-unified-*` headers, derives a mood from a 5-minute rolling rate-of-change, and broadcasts a typed `usage` payload over the DeskThing message bus.
- **Client** (`src/`, React + Vite + Tailwind) listens for `usage`, `settings`, `error`, and `action:fired` events and renders the Usage / Splash / Settings screens. Offline by design — every asset is bundled, no runtime CDN.
- **Shared** (`shared/messages.ts`) is the typed contract between server and client. Server uses relative imports (`../shared/messages`); the DeskThing CLI's esbuild server build does not honour tsconfig path aliases. Client uses the `@shared` Vite alias.

See `CLAUDE.md` (local, gitignored) for the full design brief and `CHANGELOG.md` for shipped work.

## Setup

Prerequisites:

- Node 20+ (LTS recommended).
- [Claude Code](https://github.com/anthropics/claude-code) installed and logged in once on the host that runs the DeskThing server, so `~/.claude/.credentials.json` exists.
- A working DeskThing server install (web or desktop) on that host.

Install dependencies:

```bash
npm install
```

## Development

| Command                 | What it does                                                            |
| ----------------------- | ----------------------------------------------------------------------- |
| `npm run dev`           | Starts the DeskThing dev wrapper + Vite client with live reload.        |
| `npm run dev:vite`      | Vite only (UI shell without the server bridge — useful for layout work).|
| `npm run build`         | Produces `dist/clawdmeter-deskthing-v<version>.zip` via `@deskthing/cli`.|
| `npm run typecheck`     | Runs client, server, and test tsconfig projects with `--noEmit`.        |
| `npm run lint`          | ESLint over the whole repo.                                             |
| `npm test`              | Runs the Vitest suite once.                                             |
| `npm run test:watch`    | Vitest in watch mode.                                                   |
| `npm run test:coverage` | Vitest with v8 coverage (HTML report in `coverage/`).                   |

The standard pre-PR loop: `npm run typecheck && npm run lint && npm test && npm run build`.

## Install on a DeskThing server

1. Run `npm run build`. The installable bundle lands at `dist/clawdmeter-deskthing-v0.1.0.zip`.
2. Upload the zip via your DeskThing server's app installer (the UI varies by build).
3. Enable the app, open its settings, and confirm `credentialsPath` resolves on the host.
4. Map physical Car Thing buttons to the actions you want under the DeskThing mappings UI.

## Settings reference

| Key                      | Type       | Default                        | Range       | Notes                                                                  |
| ------------------------ | ---------- | ------------------------------ | ----------- | ---------------------------------------------------------------------- |
| `pollIntervalSec`        | number     | `60`                           | `30..600`   | Seconds between Anthropic pings; below 30 may trip the rate limit.     |
| `credentialsPath`        | string     | `~/.claude/.credentials.json`  | —           | Server-side path. `~` expands to the host user's home.                  |
| `splashEnabled`          | boolean    | `true`                         | —           | If false, the client stays on the Usage screen.                         |
| `splashRotateSec`        | number     | `20`                           | `5..300`    | Seconds before flipping Usage ↔ Splash.                                 |
| `animationGroupOverride` | select     | `auto`                         | see options | `auto` / `idle` / `active` / `busy` / `frantic` — forces a mood tier.   |
| `usageWarningPct`        | range      | `80`                           | `1..100`    | Bars switch to warning colour at this utilisation.                      |
| `hostKeystrokeBackend`   | select     | `auto`                         | see options | How `clawd:voice_ptt` / `clawd:mode_toggle` dispatch keys to the host. `auto` probes per-platform; `off` disables. |

Settings live on the DeskThing server and are pushed to the client via a typed `settings` message whenever they change.

## Actions reference

All actions appear in the DeskThing mappings UI and can be bound to any physical Car Thing input.

| Action ID                | Effect                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `clawd:refresh_now`      | Triggers an immediate Anthropic poll (skipped if a poll is already in flight).      |
| `clawd:cycle_animation`  | Cycles the client between Usage and Splash views.                                   |
| `clawd:voice_ptt`        | Sends Space to the focused host window via the configured `hostKeystrokeBackend`.   |
| `clawd:mode_toggle`      | Sends Shift+Tab to the focused host window via the configured `hostKeystrokeBackend`. |

### Host-keystroke dispatch

`clawd:voice_ptt` and `clawd:mode_toggle` synthesise host keystrokes by shelling out from the DeskThing server (Node) to a platform-native input tool — the same approach `nut.js` / `robotjs` use internally, minus the native-module load problem inside the DeskThing runtime. The backend is selected per the `hostKeystrokeBackend` setting:

| Platform        | Backend       | Prerequisite                                                                  |
| --------------- | ------------- | ----------------------------------------------------------------------------- |
| macOS           | `osascript`   | Built into macOS. May prompt for Accessibility permission on first run.       |
| Linux X11       | `xdotool`     | `sudo apt install xdotool` (Debian/Ubuntu) / `sudo dnf install xdotool` (Fedora). |
| Linux Wayland   | `wtype`       | `sudo apt install wtype` / build from source. Recommended for Wayland.        |
| Linux Wayland   | `ydotool`     | Requires `ydotoold` daemon running; an alternative when `wtype` is unavailable. |
| Windows         | `powershell`  | Built into Windows (uses `System.Windows.Forms.SendKeys`).                    |
| any             | `off`         | Disable host keystroke dispatch entirely.                                     |

`auto` probes the appropriate tool for the current platform at startup (Wayland Linux probes `wtype` first; X11 Linux probes `xdotool` first). If no tool is available the backend falls back to `off` and the action becomes a no-op — change the `hostKeystrokeBackend` setting to surface the right prerequisite. Power users can pin a specific backend to override probing, or set `off` to opt out entirely.

The dispatcher does not bundle any native binaries; everything is a short shell-out with a 200 ms timeout, and dispatch failures are logged but never thrown back into the action handler.

## Troubleshooting

- **No usage updates after install.** Open Settings on the Car Thing and check `credentialsPath`. Server logs are prefixed `[Clawdmeter Server]`; look for `credentials:not_found` or `credentials:expired`. Fix: log in with Claude Code again (`claude login`).
- **Settings shows `anthropic:http:401`.** Your OAuth token is rejected. Refresh with `claude login`.
- **Settings shows `anthropic:http:429`.** Rate-limited. The server backs off exponentially up to `pollIntervalSec × 8` (and honours `retry-after` if Anthropic sends one). Raise `pollIntervalSec` if this happens often.
- **Settings shows `anthropic:timeout`.** Default request timeout is 15 s. Network issue between the DeskThing host and the Anthropic API.
- **`usage.waiting` never goes away.** First poll hasn't completed yet — wait `pollIntervalSec + 5`. If it persists, check the server log for an error.
- **Mappings don't fire host keys.** Check the server log for `host keystroke backend resolved` — if `backend=off`, the probe failed. On Linux install `xdotool` (X11) or `wtype` (Wayland). On macOS grant the DeskThing process Accessibility permission. Then pin `hostKeystrokeBackend` to the explicit value or restart the app so `auto` re-probes.

## Testing

The repo ships a Vitest suite covering the deterministic parts of the codebase:

- `tests/shared/messages.test.ts` — defaults, namespacing, exhaustive variant discrimination.
- `tests/server/credentials.test.ts` — both credential JSON shapes, tilde expansion, every typed error code, expiry detection. Uses real temporary files via `node:fs`.
- `tests/server/anthropic.test.ts` — request shape, header parsing (numeric and RFC 3339 resets), percentage clamping, 429 + `retry-after` extraction, network failure mapping. Uses `vi.stubGlobal('fetch')`.
- `tests/server/mood.test.ts` — rolling-window rate-of-change and tier thresholds, override behaviour, window pruning.
- `tests/server/settings.test.ts` — coercion rules in `readSettingsSnapshot` for missing / malformed / falsy values.
- `tests/server/poller.test.ts` — happy path, error-broadcast wiring, in-flight guard, 429 backoff timing. Mocks `credentials`, `anthropic`, and `log` modules via `vi.mock` + `vi.hoisted`.
- `tests/client/format.test.ts` — `formatResetMinutes` / `formatRelativeAge` edge cases.

Run with `npm test`. Watch mode with `npm run test:watch`. Coverage with `npm run test:coverage` writes an HTML report under `coverage/`.

UI smoke testing on the actual Car Thing display (DoD §10.3-10.5) requires a live DeskThing server install — install the built zip and walk through the checklist in `CHANGELOG.md`.

## Project layout

```
clawdmeter-deskthing/
├── deskthing/
│   ├── manifest.json           # app manifest read by the DeskThing CLI
│   └── icons/clawdmeter.svg    # app icon (original SVG)
├── server/                      # Node runtime
│   ├── index.ts                 # start/stop/purge lifecycle
│   ├── anthropic.ts             # one-token Haiku ping + header parsing
│   ├── credentials.ts           # ~/.claude/.credentials.json reader
│   ├── mood.ts                  # 5-min rolling rate → mood tier
│   ├── poller.ts                # orchestrator with backoff + single-flight
│   ├── settings.ts              # DeskThing.initSettings + snapshot reader
│   ├── actions.ts               # registers the four Clawdmeter actions
│   ├── keys.ts                  # host-keystroke dispatch (osascript/xdotool/wtype/ydotool/powershell)
│   └── log.ts                   # redacting logger
├── src/                         # React client (Vite-bundled)
│   ├── App.tsx                  # Usage / Splash / Settings router
│   ├── components/              # MeterMascot, UsageScreen, SplashScreen, …
│   ├── hooks/                   # useDeskThingMessage, useUsage
│   ├── lib/                     # typed @deskthing/client wrapper, formatters
│   └── i18n/                    # en.json + t() helper
├── shared/
│   └── messages.ts              # ServerToClient / ClientToServer contract
├── tests/                       # Vitest suite
├── index.html
├── vite.config.ts / tailwind.config.js / postcss.config.js / eslint.config.js
├── deskthing.config.js
├── tsconfig*.json               # client, server, node, test projects
├── vitest.config.ts
├── README.md / CHANGELOG.md / LICENSING.md / LICENSE
└── .env.example
```

## Licensing

Code is Apache-2.0 (see `LICENSE`). See `LICENSING.md` for the full asset inventory, the licence story versus upstream Clawdmeter, and the deliberate choice to ship an original mascot ("Pip") instead of redistributing the upstream Clawd pixel-art.
