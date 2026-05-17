# Claude Status for DeskThing

Live Claude Code session and weekly usage meters for the [Spotify Car Thing](https://github.com/ItsRiprod/DeskThing) running on the DeskThing platform. Originally inspired by the [Clawdmeter](https://github.com/HermannBjorgvin/Clawdmeter) ESP32 dashboard.

## Purpose

- Show Claude Code session (5h) and weekly (7d) utilisation on the Car Thing's 800×480 display.
- Surface reset countdowns and rate-limit status without leaving the dashboard.
- Drive the Clawd pixel-art mascot through five idle animations (breathe / blink / look around / strawberry / bubbles) plus expression, work, and dance pools that escalate with usage rate.
- Bridge granular counter plateaus with cross-window activity memory so the mascot doesn't snap to idle while Claude is still working.
- Register host-keystroke actions (push-to-talk, mode toggle) bindable via DeskThing's mappings UI.
- Run entirely through the DeskThing server/client architecture — no BLE, no systemd.

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

- **Server** (`server/`, Node) is the only network caller. It reads the Claude Code OAuth token from disk, pings `POST https://api.anthropic.com/v1/messages` with a one-token Haiku call once per `pollIntervalSec`, parses the `anthropic-ratelimit-unified-*` headers, derives a mood, and broadcasts a typed `usage` payload over the DeskThing message bus.
- **Client** (`src/`, React + Vite + Tailwind) listens for `usage`, `settings`, `error`, and `action:fired` events and renders the Usage / Splash / Settings screens. Offline by design — every asset (including Clawd sprite JSONs) is bundled, no runtime CDN.
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

### Regenerating idle sprites

`scripts/generate-idle-sprites.mjs` builds the bespoke `idle_strawberry` and `idle_bubbles` sprites from a shared Clawd base pose + overlay primitives. Re-run after editing the shape definitions:

```bash
node scripts/generate-idle-sprites.mjs
```

Output overwrites `assets-proprietary/clawd/idle_{strawberry,bubbles}.json`. Vite's `import.meta.glob` picks them up on the next build.

## Install on a DeskThing server

1. Run `npm run build`. The installable bundle lands at `dist/claude-status-deskthing-v<version>.zip`.
2. Upload the zip via your DeskThing server's app installer (the UI varies by build).
3. Enable the app, open its settings, and confirm `credentialsPath` resolves on the host.
4. Map physical Car Thing buttons to the actions you want under the DeskThing mappings UI.

## Settings reference

| Key                      | Type       | Default                        | Range       | Notes                                                                  |
| ------------------------ | ---------- | ------------------------------ | ----------- | ---------------------------------------------------------------------- |
| `pollIntervalSec`        | number     | `60`                           | `30..600`   | Seconds between Anthropic pings; below 30 may trip the rate limit. Changing it now restarts the auto-poll interval (was a bug ≤ v0.3.1). |
| `credentialsPath`        | string     | `~/.claude/.credentials.json`  | —           | Server-side path. `~` expands to the host user's home.                  |
| `splashEnabled`          | boolean    | `true`                         | —           | When idle → splash screen; when active/busy/frantic → usage stats.      |
| `animationGroupOverride` | select     | `auto`                         | see options | `auto` / `idle` / `active` / `busy` / `frantic` — forces a mood tier.   |
| `usageWarningPct`        | range      | `80`                           | `1..100`    | Bars switch to warning colour at this utilisation.                      |

Settings live on the DeskThing server and are pushed to the client via a typed `settings` message whenever they change.

> `splashRotateSec` exists in `SettingsSnapshot` (default `20`) but is not currently registered in the DeskThing settings UI and is not read by any client component. The sprite-rotation cadence is hardcoded to `8` seconds inside `ClawdSprite`. Wiring `splashRotateSec` through the settings form is a planned follow-up.

## Mood system

The server's `MoodTracker` (`server/mood.ts`) combines four signals and returns the loudest mood any of them implies:

| Signal              | Source                                                          | Triggers                                                        |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| **rate**            | session-pct delta over the 5-min sample window                  | `idle <0.02` / `active 0.02–0.2` / `busy 0.2–0.33` / `frantic ≥0.33` pp/min |
| **absolute**        | most recent `sessionPct` value                                  | `active ≥50%` / `busy ≥75%` / `frantic ≥90%`                    |
| **in-window movement** | any forward delta between consecutive samples in the window  | `active`                                                        |
| **recent movement (memory)** | timestamp of last forward tick on session OR weekly counter | `active` while `now - lastForwardAt ≤ 10 min`                  |

The cross-window memory was added in v0.3.2 to fix mood flicker on granular counters: the unified-5h counter often plateaus 1–3 polls between visible ticks during normal Sonnet usage, which used to drop mood back to idle while Claude was still humming. Diagnostics: every `poll ok` log line includes `ratePpm`, `samples`, and `lastForwardAgoSec`.

`animationGroupOverride` short-circuits all four signals when set to anything other than `auto`.

### Sprite rotation

Once a mood is derived, the client picks animations from a category pool and cycles between them every 8 seconds (hardcoded in `ClawdSprite`):

| Mood     | Pool         | Sprites                                                                 |
| -------- | ------------ | ----------------------------------------------------------------------- |
| idle     | `Idle`       | breathe, blink, look around, **strawberry**, **bubbles**                |
| active   | `Expressions`+`Idle` | wink, surprise, sleep, + idle pool                              |
| busy     | `Work`       | coding, think                                                           |
| frantic  | `Dance`      | bounce, sway, djmix, bounce_dj, sway_dj                                 |

`strawberry` and `bubbles` are bespoke animations added in v0.3.3 (Clawd nibbles a strawberry / blows soap bubbles). All sprite data lives under `assets-proprietary/clawd/*.json` and is bundled into the client JS at build time via `import.meta.glob`.

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
- **Mood stuck at idle while clearly working.** Check the latest `poll ok` log line: `lastForwardAgoSec` should be a small number (< 600 s) when the counter is actively ticking. If it's `null`, the unified-5h counter hasn't moved since the app started — try forcing a refresh via the `clawd:refresh_now` action or wait for the next poll. If it stays `null` for many polls during real usage, the credentials file may be stale.
- **Mood flickers between busy and idle.** Should not happen since v0.3.2 — the 10-min cross-window memory bridges plateaus. If you see it, raise an issue with the poll-log diagnostics (`ratePpm`, `samples`, `lastForwardAgoSec`) from a few consecutive polls.
- **Settings shows `anthropic:http:401`.** Your OAuth token is rejected. Refresh with `claude login`.
- **Settings shows `anthropic:http:429`.** Rate-limited. The server backs off exponentially up to `pollIntervalSec × 8` (and honours `retry-after` if Anthropic sends one). Raise `pollIntervalSec` if this happens often.
- **Settings shows `anthropic:timeout`.** Default request timeout is 15 s. Network issue between the DeskThing host and the Anthropic API.
- **`usage.waiting` never goes away.** First poll hasn't completed yet — wait `pollIntervalSec + 5`. If it persists, check the server log for an error.
- **Mappings don't fire host keys.** Known limitation — see above.

## Testing

Run with `npm test`. Watch mode: `npm run test:watch`. Coverage: `npm run test:coverage`. Current suite: **67 tests** across 7 files exercising message contracts, credentials, Anthropic header parsing, mood signals (incl. plateau bridging), settings coercion, poller orchestration, and client format helpers.

## Licensing

Code is Apache-2.0 (see `LICENSE`). The Clawd pixel-art sprites bundled under `assets-proprietary/clawd/` are third-party copyrighted material redistributed in this **private fork** under personal-use terms — see `LICENSING.md` and `assets-proprietary/NOTICE.md` for the full notice. Do not redistribute built zips containing the bundled sprites.
