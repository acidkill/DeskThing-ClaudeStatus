# Claude Status for DeskThing

Live Claude Code session and weekly usage meters for the [Spotify Car Thing](https://github.com/ItsRiprod/DeskThing) running on the DeskThing platform. Originally inspired by the [Clawdmeter](https://github.com/HermannBjorgvin/Clawdmeter) ESP32 dashboard.

## Purpose

- Show Claude Code session (5h) and weekly (7d) utilisation on the Car Thing's 800×480 display, each bar carrying its own rate-limit status and a badge on whichever window is currently the binding constraint.
- Surface reset countdowns and rate-limit status without leaving the dashboard.
- Drive the original orange-robot vector mascot through ten idle animations (breathe / blink / look around / power-token / status-pings / data-panel reading / head shake / walk / jump rope / dozing) plus expression, work, and dance pools that escalate with usage rate — one calm face per clip, not a carousel of them; see [Editing the mascot](#editing-the-mascot).
- Bridge granular counter plateaus with cross-window activity memory so the mascot doesn't snap to idle while Claude is still working.
- Dispatch host-keystroke actions (push-to-talk, mode toggle) to the OS via a platform-native backend, bindable via DeskThing's mappings UI.
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
- **Client** (`src/`, React + Vite + Tailwind) listens for `usage`, `settings`, `error`, and `action:fired` events and renders the Usage / Splash / Settings screens. Offline by design — the mascot is inline SVG compiled into the client bundle, no runtime CDN and no image requests.
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

### Editing the mascot

The mascot is a vector rig under `src/mascot/`, rendered as inline SVG on one shared
`viewBox="0 0 2048 2048"`:

| File | Role |
| --- | --- |
| `casing.ts` | **Generated** from `assets/mascot-v2/clawdbot-master.svg` — 30 casing paths + 1 screen path. Do not hand-edit. |
| `faces.ts` | The 12 LED expressions. Stroked glyphs only, drawn on the screen grid exported by `casing.ts`. |
| `props.ts` | The prop layers (power token, bubbles, book, rope, laptop, wand/blackboard, thought bubble, DJ headphones, DJ deck), each flagged `attached` (worn/held) or detached, and layered `behind` or `front`. |
| `animations.ts` | The 20-entry catalogue — id, name, category, motion, optional prop, LED face track — plus the mood → category mapping. |
| `motion.ts` | Pure scheduling policy: clip-rotation period, whether the face track may run, and the per-mood resting expression used under reduced motion. No JSX, so it is unit-testable without a DOM. |
| `MascotSprite.tsx` | Composites them and drives the face track; body motion comes from the `animate-motion-*` Tailwind keyframes. |

**Persona lock:** `CASING_PATHS` and `SCREEN_PATHS` are emitted identically in every frame of
every animation. An animation may only vary the LED face, the prop layer, and the CSS transform.
Nothing may add, remove, recolour, or re-path the casing. This is *markup* identity, not pixel
identity: a worn or held prop (headphones, a book, a wand) legitimately paints over casing pixels —
that is what wearing and holding mean. A merely nearby prop such as the thought bubble must not,
because a hole in the silhouette reads as a broken shell. No prop of any kind may cover the face
screen. Re-export `casing.ts` from the master SVG rather than editing either by hand.

**Reduced motion:** under `prefers-reduced-motion: reduce` the rig stops every scheduler — no clip
rotation, no face-track timeout, no `animate-motion-*` class. It does *not* freeze on the clip's
step-0 expression, because clips within a mood share their opening face and three of the four moods
would collapse onto one identical sprite. Instead each mood holds a characteristic resting
expression from `RESTING_EXPRESSION` in `motion.ts` — idle → `neutral`, active → `happy`,
busy → `focus`, frantic → `excited` — so the mood still reads at a glance while nothing moves.

**Face policy — one calm expression, not a carousel:** a clip holds a single base expression for
several seconds, interrupted only by punctuation (a blink; in `active`, a brief wink or startle)
that returns to the same face rather than reading as a mood change. `FACE_POLICY` in
`animations.ts` makes this a checked contract per mood — allowed base palette, minimum base hold,
punctuation ceiling, max distinct base expressions — enforced by
`tests/client/mascot-face-policy.test.ts`. Only `frantic` is exempt: fast, wide-ranging faces are
the correct signal at 90%+ utilisation, not something to calm down. Mood routing can override a
clip's v1 category via the optional `moods` field on `MascotAnimation` — used once, to route
`expression_sleep` to `idle` instead of the `active` its `Expressions` category would otherwise
imply, so an actively-working session can't show a sleeping mascot.

The legacy 20×20 pixel-art pipeline in `scripts/sprite-pipeline/` and its output in
`assets/mascot/*.json` are retained for reference only — the client no longer loads them.

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
| `splashRotateSec`        | number     | `20`                           | `2..300`    | Seconds each mascot clip plays before the splash rotates to the next one. |
| `animationGroupOverride` | select     | `auto`                         | see options | `auto` / `idle` / `active` / `busy` / `frantic` — forces a mood tier.   |
| `usageWarningPct`        | range      | `80`                           | `1..100`    | Bars switch to warning colour at this utilisation.                      |
| `hostKeystrokeBackend`   | select     | `auto`                         | see options | `auto` / `osascript` / `xdotool` / `wtype` / `ydotool` / `powershell` / `off` — which platform tool dispatches host keystrokes. `auto` probes available tools at startup. |

Settings live on the DeskThing server and are pushed to the client via a typed `settings` message whenever they change.

## Usage display

The Anthropic response carries a status **per rate-limit window**, not just one overall status —
confirmed live against this app's own OAuth token: `anthropic-ratelimit-unified-5h-status`,
`-7d-status`, and `-representative-claim` (the window currently constraining work). The server
parses all three (`server/anthropic.ts`) into `UsagePayload.ss` (session status), `.ws` (weekly
status), and `.bind` (`'session' | 'weekly' | null`).

Each `UsageBar` renders its own window's status — a rejecting weekly limit no longer paints the
session bar red as well — and the bar named by `.bind` gets a small **Binding** badge, so the
screen shows at a glance which limit is actually the one being hit right now. `.bind` is `null`
when Anthropic's claim is unrecognised; the badge is simply omitted rather than guessing.

A **Weekly Fable** dimension was investigated for this release and does not exist on this app's
API surface — the OAuth scope this server authenticates with (`oauth-2025-04-20`) only pings
Haiku, and Haiku's response carries exactly the two windows above. It was dropped from scope
rather than shipped as a permanently-empty third bar.

## Mood system

The server's `MoodTracker` (`server/mood.ts`) combines four signals and returns the loudest mood any of them implies:

| Signal              | Source                                                          | Triggers                                                        |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| **rate**            | session-pct delta over the 5-min sample window                  | `idle <0.02` / `active 0.02–0.2` / `busy 0.2–0.33` / `frantic ≥0.33` pp/min |
| **absolute**        | most recent `sessionPct` value                                  | `active ≥50%` / `busy ≥75%` / `frantic ≥90%`                    |
| **in-window movement** | any forward delta between consecutive samples in the window  | `active`                                                        |
| **recent movement (memory)** | ring buffer of forward ticks on session OR weekly counter in the last 20 min | 1 tick → `active` / 2–3 ticks → `busy` / ≥4 ticks → `frantic` |

The memory signal (introduced in v0.3.2, count-based escalation added in v0.3.4) was designed for Sonnet 4.6's granular unified-5h counter, which often plateaus 5–15 minutes between visible ticks during normal conversation. A single tick keeps the mascot at active for 20 minutes; sustained ticking pushes it through busy to frantic without needing the rate or absolute signals to fire. Diagnostics: every `poll ok` log line includes `ratePpm`, `samples`, `fwdTicks20m`, and `lastForwardAgoSec`.

`animationGroupOverride` short-circuits all four signals when set to anything other than `auto`.

### Sprite rotation

Once a mood is derived, the client picks animations from a category pool and cycles between them
every `splashRotateSec` seconds (default `20`, floored at `2` by `MIN_ROTATE_SEC` in
`src/mascot/motion.ts`). `MascotSprite` falls back to `8` seconds only when a caller renders it
without a `rotateSec` prop; `SplashScreen` always passes the setting through.

| Mood     | Pool         | Robot animations                                                                            |
| -------- | ------------ | ------------------------------------------------------------------------------------------- |
| idle     | `Idle` + `sleep` override | breathe, blink, look around, power-token, status-pings, data-panel reading, head shake, walk, jump rope, dozing |
| active   | `Expressions` (minus `sleep`) | wink, surprise                                                                  |
| busy     | `Work`       | coding (laptop), wand (star burst + sparkles)                                                |
| frantic  | `Dance`      | bounce, sway, dj-mix, bounce-dj, sway-dj (headphones)                                        |

All 20 animations are original vector art defined in `src/mascot/` and inlined as SVG — see
[Editing the mascot](#editing-the-mascot). `expression_sleep` is filed under the `Expressions`
category for v1 parity but explicitly routed to `idle` (see the face-policy note above) — a
sleeping mascot would otherwise be reachable from `active`. `active` lists `Idle` as a fallback
pool, but `Expressions` always has hits, so the fallback never fires. `work_think` lives in the
`Archive` category — catalogued for parity, but reachable by no mood.

The mood thresholds in `MoodTracker` are calibrated for Sonnet 4.6 normal-use granularity. Opus 4.7 burns budget ~5× faster per token, so the same user behaviour escalates mood more aggressively on Opus — this is intentional and reflects the actual rate of budget consumption.

## Actions reference

All actions appear in the DeskThing mappings UI and can be bound to any physical Car Thing input.

| Action ID                | Effect                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `clawd:refresh_now`      | Triggers an immediate Anthropic poll (skipped if a poll is already in flight).      |
| `clawd:cycle_animation`  | Cycles the client between Usage and Splash views.                                   |
| `clawd:voice_ptt`        | Sends Space to the host's focused window (push-to-talk for Claude Code voice mode). |
| `clawd:mode_toggle`      | Sends Shift+Tab to the host's focused window.                                       |

### Host-keystroke dispatch

`server/keys.ts` probes the host at startup for a working keystroke backend —
`osascript` (macOS), `xdotool` / `wtype` / `ydotool` (Linux, X11 or Wayland), or
`powershell` (Windows) — and wires `clawd:voice_ptt` / `clawd:mode_toggle` to send
Space / Shift+Tab through whichever one is available. `hostKeystrokeBackend`
(above) pins a specific backend or disables dispatch (`off`); on a host with none
of the above tools, probing resolves to `off` on its own and the actions still
register and fire client-side, they just don't reach the OS. PTT fires a single
keypress per action trigger — DeskThing's action API does not distinguish
press/release, so a true press-and-hold isn't possible yet.

## Troubleshooting

- **No usage updates after install.** Open Settings on the Car Thing and check `credentialsPath`. Server logs are prefixed `[claude-status]`; look for `credentials:not_found` or `credentials:expired`. Fix: log in with Claude Code again (`claude login`).
- **Mood stuck at idle while clearly working.** Check the latest `poll ok` log line: `fwdTicks20m` should be ≥ 1 when the unified-5h counter has ticked recently. If `fwdTicks20m=0` and `lastForwardAgoSec=null`, the counter hasn't moved since the app started — try forcing a refresh via the `clawd:refresh_now` action or wait for the next poll. If it stays at zero for many polls during real usage, the credentials file may be stale.
- **Mood stuck at active, never escalating to busy or frantic.** Memory escalation needs ≥ 2 forward ticks within 20 minutes. If `fwdTicks20m=1` in the log line, the counter has only moved once in that window — typical for very light usage or a coarse-tick day. Sustained activity should push it to 2+ ticks → busy / 4+ → frantic.
- **Mood flickers between busy and idle.** Should not happen since v0.3.2 / v0.3.4 — the 20-min memory bridges plateaus. If you see it, share the poll-log diagnostics (`ratePpm`, `samples`, `fwdTicks20m`, `lastForwardAgoSec`) from a few consecutive polls.
- **Settings shows `anthropic:http:401`.** Your OAuth token is rejected. Refresh with `claude login`.
- **Settings shows `anthropic:http:429`.** Rate-limited. The server backs off exponentially up to `pollIntervalSec × 8` (and honours `retry-after` if Anthropic sends one). Raise `pollIntervalSec` if this happens often.
- **Settings shows `anthropic:timeout`.** Default request timeout is 15 s. Network issue between the DeskThing host and the Anthropic API.
- **`usage.waiting` never goes away.** First poll hasn't completed yet — wait `pollIntervalSec + 5`. If it persists, check the server log for an error.
- **Mappings don't fire host keys.** Check `hostKeystrokeBackend` in Settings — if it's `off`, no compatible tool was found on the host at startup (or it was set manually). Install `xdotool`/`wtype`/`ydotool` (Linux) or confirm `osascript`/`powershell` are reachable, then restart the app so the backend probe re-runs.

## Testing

Run with `npm test`. Watch mode: `npm run test:watch`. Coverage: `npm run test:coverage`. Current suite: **284 tests** across 13 files exercising message contracts, credentials, Anthropic header parsing (incl. per-window status and the representative-claim binding window), host-keystroke backend probing/dispatch, mood signals (incl. plateau bridging + tick-count escalation), settings registration and coercion, poller orchestration, client format helpers, and the mascot rig (catalogue integrity and mood-routing overrides, persona lock via output extraction, prop geometry, reduced-motion scheduling policy, and the face-policy contract).

The suite runs in Vitest's `node` environment — there is no jsdom, happy-dom, or Testing Library in
this project. React effects therefore never run under test, so mascot behaviour driven by timers is
tested through the pure functions in `src/mascot/motion.ts` rather than through rendered timers.

## Licensing

Everything in this repository ships under the **Apache License 2.0** as of v0.4.0 — code, mascot art, manifests, icons. The previous proprietary-art dependency was retired when the mascot was swapped to an original orange robot: first a 20×20 pixel-art set, now the vector rig in `src/mascot/` drawn from `assets/mascot-v2/clawdbot-master.svg` (anatomy inspired by Foozle's CC0 "Cute Platformer Robot"; all path data and choreographies are ours). Built ZIPs are freely redistributable. See `LICENSING.md` for the full inventory and attribution notes.
