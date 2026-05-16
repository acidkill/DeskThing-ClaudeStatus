# Changelog

All notable changes to this project will be documented in this file. Format: Keep a Changelog; versions follow SemVer.

## [Unreleased]

### Added
- Repository scaffold: Vite + React 18 + TypeScript + Tailwind 3, DeskThing CLI scripts, strict tsconfig with `noUncheckedIndexedAccess`.
- `deskthing/manifest.json` for app id `clawdmeter`, server/client v11 compatibility.
- Shared typed message contract in `shared/messages.ts` (`UsagePayload`, `ServerToClient`, `ClientToServer`, default settings, action ids).
- Server skeleton with `start` / `stop` / `purge` lifecycle, redacting logger, and settings registration via `DeskThing.initSettings`.
- Client stub renders Clawdmeter placeholder on a Car-Thing-sized viewport.

### Notes
- Polling, Anthropic client, mood derivation, action registration, and host-keystroke dispatch are deferred to Phases 3 and 4.
