# Changelog

All notable changes to this project will be documented in this file. Format: Keep a Changelog; versions follow SemVer.

## [Unreleased]

### Added
- Repository scaffold: Vite + React 18 + TypeScript + Tailwind 3, DeskThing CLI scripts, strict tsconfig with `noUncheckedIndexedAccess`.
- `deskthing/manifest.json` for app id `claude-status`, server/client v11 compatibility.
- Shared typed message contract in `shared/messages.ts` (`UsagePayload`, `ServerToClient`, `ClientToServer`, default settings, action ids).
- Server skeleton with `start` / `stop` / `purge` lifecycle, redacting logger, and settings registration via `DeskThing.initSettings`.
- Client stub renders Claude Status placeholder on a Car-Thing-sized viewport.

### Added (Phase 3)
- `server/credentials.ts`: reads `~/.claude/.credentials.json` (with `~` expansion), supports both `claudeAiOauth.accessToken` and `access_token` shapes, surfaces typed `CredentialsError` (`NOT_FOUND` / `UNREADABLE` / `INVALID_JSON` / `NO_TOKEN` / `EXPIRED`).
- `server/anthropic.ts`: one-token Haiku ping with `Authorization: Bearer` + `anthropic-beta: oauth-2025-04-20`, parses the five `anthropic-ratelimit-unified-*` headers into a normalised `RateLimitSnapshot` (percentages clamped 0–100, resets normalised to minutes whether the upstream sends seconds or RFC 3339), surfaces `AnthropicError` with `retry-after` extraction.
- `server/mood.ts`: 5-minute rolling sample window → percentage-points-per-minute → `idle | active | busy | frantic` thresholds; honours `animationGroupOverride !== 'auto'`.
- `server/poller.ts`: orchestrates credentials → Anthropic ping → mood → broadcast `usage`; single-flight guard so a slow request never stacks ticks; exponential backoff on 429 capped at `pollIntervalSec × 8` (honours `retry-after` when present); surfaces `error` messages with stable codes.
- `server/index.ts` wires the poller, schedules ticks via `DeskThing.setInterval`, re-polls when `pollIntervalSec` changes.

### Added (Phase 4)
- `server/actions.ts`: registers the four CLAUDE.md §5 actions (`clawd:voice_ptt`, `clawd:mode_toggle`, `clawd:cycle_animation`, `clawd:refresh_now`) via `DeskThing.registerAction`, listens on `DESKTHING_EVENTS.ACTION`, routes refresh to the poller and emits `action:fired` for the client.
- `shared/messages.ts`: added `action:fired` to `ServerToClient` and `ActionId` helper type.
- `request:refresh` / `request:settings` listeners on the server respond to client-initiated requests.

### Documented limitation
- Host-keystroke dispatch is **not implemented** — `@deskthing/server` 0.11 has no `sendKey`-equivalent. `clawd:voice_ptt` and `clawd:mode_toggle` register and fire (visible in the mappings UI), but the Space / Shift+Tab dispatch to the focused host window depends on a DeskThing platform feature that does not yet exist. README troubleshooting section flags this.

### Added (Phase 5)
- `src/lib/deskthing.ts`: typed `createDeskThing<ServerToClient, ClientToServer>()` wrapper so all client send/receive is type-checked against `shared/messages.ts`.
- `src/hooks/useDeskThingMessage.ts` + `src/hooks/useUsage.ts`: thin typed subscription helpers; `useUsage` tracks `usage`, `error`, `settings`, and the most recent action — and requests an initial settings snapshot on mount.
- `src/components/UsageBar.tsx`, `ResetCountdown.tsx`, `StatusPill.tsx`: shared display primitives with tone (`ok` / `warn` / `err`) derived from `usageWarningPct` and `status`.
- `src/components/MeterMascot.tsx`: original SVG mascot ("Pip") — a cyan/teal capsule character with cheeks, eye-blink, body-breath, and a tiny swinging gauge whose animation speed scales with mood (idle → active → busy → frantic). Hand-authored, not derived from Clawd or any other mascot, no external assets.
- `src/components/UsageScreen.tsx`: two-column layout for 800×480 — bars + countdowns + status pill on the left, mascot + mood label on the right.
- `src/components/SplashScreen.tsx`: centered mascot at 320 px with mood label.
- `src/components/SettingsScreen.tsx`: read-only snapshot of the six settings, last error pane, manual refresh button, mood-preview mascot.
- `src/App.tsx`: routes between Usage / Splash / Settings. Auto-rotates Usage ↔ Splash every `splashRotateSec` when `splashEnabled`. `clawd:cycle_animation` action advances the rotation. Touchable nav pill toggles into Settings and back.
- `src/i18n/`: extracted every user-facing string into `en.json` with a `t(key, vars)` helper — no hardcoded UI copy in components.
- `tailwind.config.js`: mood-driven keyframes and animation utilities (`mood-idle/active/busy/frantic`, `blink-slow/fast`, `gauge-slow/active/busy/frantic`) used by the mascot.

### Verified
- `npm run typecheck`, `npm run lint`, `npm run build` clean. Bundle still ~157 KB.
- Built client serves and renders `index.html` (HTTP 200 from a static server). Live rendering of the screens requires the DeskThing server runtime; no DeskThing instance available in this environment to verify the §10.3 / §10.4 / §10.5 DoD items end-to-end yet.

### Added (Phase 6)
- `deskthing/icons/claude-status.svg`: original app icon rendered from the Pip mascot, hand-authored geometric primitives.
- Manifest tags expanded to include `utility`.

### Added (Phase 7)
- `README.md` rewritten — architecture diagram, command table, settings reference table, actions reference table (with the host-keystroke limitation called out explicitly), troubleshooting playbook keyed by error code, testing section, project layout.
- `LICENSING.md` expanded with a bundled-asset inventory table, the deliberate Pip-vs-Clawd choice, and dependency notes.

### Added (Phase 8 — tests)
- Vitest harness: `vitest.config.ts`, `tsconfig.test.json`, `npm test` / `test:watch` / `test:coverage` scripts; `typecheck` script now also covers the test tsconfig.
- 54 tests across 7 files exercising the deterministic parts of the codebase:
  - `tests/shared/messages.test.ts` — defaults, namespacing, variant discrimination.
  - `tests/server/credentials.test.ts` — both JSON shapes, tilde expansion, every typed error code, expiry detection, against real temporary files.
  - `tests/server/anthropic.test.ts` — request shape, header parsing (numeric and RFC 3339 resets), percentage clamping, 429 with `retry-after`, network failure mapping. Uses `vi.stubGlobal('fetch')`.
  - `tests/server/mood.test.ts` — rolling-window rate, tier thresholds, override behaviour, window pruning, reset.
  - `tests/server/settings.test.ts` — coercion rules in `readSettingsSnapshot`.
  - `tests/server/poller.test.ts` — happy path, error-broadcast wiring, in-flight guard, 429 backoff timing. Modules mocked via `vi.hoisted` + `vi.mock`.
  - `tests/client/format.test.ts` — `formatResetMinutes` / `formatRelativeAge` edge cases.

### Definition-of-Done status

| § | DoD item | Status |
| - | -------- | ------ |
| 10.1 | `npm run build` exits 0, no TS errors, no Vite asset warnings | **✅ verified** |
| 10.2 | Bundle installs into a DeskThing dev instance without manifest errors | ⏸ requires live DeskThing server |
| 10.3 | Usage screen receives `usage` within `pollIntervalSec + 5` and renders both bars + countdowns | ⏸ requires live DeskThing server (poller logic covered by unit tests) |
| 10.4 | Splash mascot visibly changes group on mood change / override | ⏸ requires live DeskThing server (mood logic covered by unit tests) |
| 10.5 | Actions appear in the mappings UI and dispatch keystrokes — or limitation documented | **✅ documented** (host-keystroke dispatch genuinely missing from `@deskthing/server` 0.11; README + LICENSING + this changelog all surface it) |
| 10.6 | README covers purpose / setup / settings / troubleshooting / licensing | **✅ verified** |
| 10.7 | No proprietary Anthropic fonts or Clawd mascot art in repo | **✅ verified** (original Pip mascot only; system-font fallbacks) |
| 10.8 | No credentials, tokens, or full API responses in any log output | **✅ verified** (`server/log.ts` redacts; covered by code review — never logs token values, response bodies, or full headers) |

### Notes
- Web fonts are still not bundled. `font-sans` / `font-mono` Tailwind tokens fall back to system UI fonts. Self-hosting OFL Inter + JetBrains Mono WOFF2 is a documented follow-up.
- Live DeskThing-runtime verification (DoD §10.2–10.4) needs a real Car Thing or desktop DeskThing instance; install `dist/claude-status-deskthing-v0.3.0.zip` and walk the checklist.
