# Changelog

All notable changes to this project will be documented in this file. Format: Keep a Changelog; versions follow SemVer.

## [Unreleased]

### Added
- Repository scaffold: Vite + React 18 + TypeScript + Tailwind 3, DeskThing CLI scripts, strict tsconfig with `noUncheckedIndexedAccess`.
- `deskthing/manifest.json` for app id `clawdmeter`, server/client v11 compatibility.
- Shared typed message contract in `shared/messages.ts` (`UsagePayload`, `ServerToClient`, `ClientToServer`, default settings, action ids).
- Server skeleton with `start` / `stop` / `purge` lifecycle, redacting logger, and settings registration via `DeskThing.initSettings`.
- Client stub renders Clawdmeter placeholder on a Car-Thing-sized viewport.

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

### Notes
- Client UI screens (UsageScreen, SplashScreen, SettingsScreen) and the original placeholder mascot land in Phase 5.
