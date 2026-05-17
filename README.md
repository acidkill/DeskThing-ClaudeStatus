# Claude Status for DeskThing

Live Claude Code session and weekly usage meters for the [Spotify Car Thing](https://github.com/ItsRiprod/DeskThing) running on the DeskThing platform. Originally inspired by the [Clawdmeter](https://github.com/HermannBjorgvin/Clawdmeter) ESP32 dashboard.

## Purpose

- Show Claude Code session (5h) and weekly (7d) utilisation on the Car Thing's 800×480 display.
- Surface reset countdowns and rate-limit status without leaving the dashboard.
- Drive an original mood-aware mascot whose animation intensity scales with how fast the meter is climbing.
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

See `CHANGELOG.md` for shipped work.

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
| `npm run build`         | Produces `dist/claude-status-deskthing-v<version>.zip` via `@deskthing/cli`.|
| `npm run typecheck`     | Runs client, server, and test tsconfig projects with `--noEmit`.        |
| `npm run lint`          | ESLint over the whole repo.                                             |
| `npm test`              | Runs the Vitest suite once.                                             |
| `npm run test:watch`    | Vitest in watch mode.                                                   |
| `npm run test:coverage` | Vitest with v8 coverage (HTML report in `coverage/`).                   |

The standard pre-PR loop: `npm run typecheck && npm run lint && npm test && npm run build`.

## Install on a DeskThing server

1. Run `npm run build`. The installable bundle lands at `dist/claude-status-deskthing-v<version>.zip`.
2. Upload the zip via your DeskThing server's app installer (the UI varies by build).
3. Enable the app, open its settings, and confirm `credentialsPath` resolves on the host.
4. Map physical Car Thing buttons to the actions you want under the DeskThing mappings UI.

## Settings reference

| Key                      | Type       | Default                        | Range       | Notes                                                                  |
| ------------------------ | ---------- | ------------------------------ | ----------- | ---------------------------------------------------------------------- |
| `pollIntervalSec`        | number     | `60`                           | `30..600`   | Seconds between Anthropic pings; below 30 may trip the rate limit.     |
| `credentialsPath`        | string     | `~/.claude/.credentials.json`  | —           | Server-side path. `~` expands to the host user's home.                  |
| `splashEnabled`          | boolean    | `true`                         | —           | When idle → splash screen; when active/busy/frantic → usage stats.      |
| `animationGroupOverride` | select     | `auto`                         | see options | `auto` / `idle` / `active` / `busy` / `frantic` — forces a mood tier.   |
| `usageWarningPct`        | range      | `80`                           | `1..100`    | Bars switch to warning colour at this utilisation.                      |

Settings live on the DeskThing server and are pushed to the client via a typed `settings` message whenever they change.

## Actions reference

All actions appear in the DeskThing mappings UI and can be bound to any physical Car Thing input.

| Action ID                | Effect                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `clawd:refresh_now`      | Triggers an immediate Anthropic poll (skipped if a poll is already in flight).      |
| `clawd:cycle_animation`  | Cycles the client between Usage and Splash views.                                   |
| `clawd:voice_ptt`        | **Limitation**: intended to send Space to the focused host window. Not dispatched. |
| `clawd:mode_toggle`      | **Limitation**: intended to send Shift+Tab to the focused host window. Not dispatched. |

### Host-keystroke limitation

`@deskthing/server` 0.11 does not expose a host-keystroke dispatch API. The two keystroke actions register and fire — the app receives an `action:fired` event and logs the call — but the SDK has no way to synthesise Space / Shift+Tab on the host's focused window.

## Troubleshooting

- **No usage updates after install.** Open Settings on the Car Thing and check `credentialsPath`. Server logs are prefixed `[claude-status]`; look for `credentials:not_found` or `credentials:expired`. Fix: log in with Claude Code again (`claude login`).
- **Settings shows `anthropic:http:401`.** Your OAuth token is rejected. Refresh with `claude login`.
- **Settings shows `anthropic:http:429`.** Rate-limited. The server backs off exponentially up to `pollIntervalSec × 8` (and honours `retry-after` if Anthropic sends one). Raise `pollIntervalSec` if this happens often.
- **Settings shows `anthropic:timeout`.** Default request timeout is 15 s. Network issue between the DeskThing host and the Anthropic API.
- **`usage.waiting` never goes away.** First poll hasn't completed yet — wait `pollIntervalSec + 5`. If it persists, check the server log for an error.
- **Mappings don't fire host keys.** Known limitation — see above.

## Testing

Run with `npm test`. Watch mode: `npm run test:watch`. Coverage: `npm run test:coverage`.

## Licensing

Code is Apache-2.0 (see `LICENSE`). See `LICENSING.md` for the full asset inventory and the deliberate choice to ship an original mascot ("Pip") instead of redistributing the upstream Clawd pixel-art.
