# Licensing

## Code

This project is licensed under the **Apache License 2.0**. See `LICENSE` for the full text.

## What changed from upstream Clawdmeter

The upstream Clawdmeter repository bundles Anthropic-proprietary fonts (Tiempos Text, Styrene B) and Clawd mascot pixel-art whose redistribution rights are unclear. **This port does not perpetuate that.** Specifically:

- **Fonts:** Inter and JetBrains Mono are used, both openly licensed under the SIL Open Font License. They will be self-hosted under `public/fonts/` once Phase 5 lands, alongside their upstream `OFL.txt` files.
- **Mascot art:** No Clawd pixel-art ships in this repo. Phase 5 will introduce an original placeholder sprite sheet plus a BYO-sprites loader (user-supplied path via settings) for anyone who has their own assets.
- **Anthropic branding:** This is a third-party tool that reads the Anthropic API's rate-limit response headers. No Anthropic wordmark, logo, or brand fonts appear in the UI or assets.

## Bundled assets

A full inventory of bundled assets and their individual licences will land in this file once Phase 5 (client UI) is complete.
