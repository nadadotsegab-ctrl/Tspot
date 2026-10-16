# TSPOT reconstruction ledger

## Scope

Requested reference: https://open.spotify.com/ (also described as spotify.com).
Requested identity: TSPOT.
Deliverable: a running custom music frontend in `/workspace/REA`.

## Findings and evidence

| Question | Result | Evidence and boundary |
| --- | --- | --- |
| What does the current Spotify web player render? | Unresolved | Shell HTTPS request failed with proxy CONNECT 403. REA browser navigation failed before initial capture. `evidence/spotify-capture.json` retains the failure and explicitly incomplete observation. No successful Spotify Evidence ID or screenshot exists. |
| Which design can be implemented independently? | Implemented design choice | Dark library/navigation shell, a search header, prominent curated mix, six custom covers, song rows, and a persistent player. These are familiar music-app conventions, not observations of the current Spotify deployment. |
| Does TSPOT's home open the selected playlist? | Observed | REA Evidence `ev_2be9313edb0a810bfd9f1ad34829fbf3745875cb05f20d14fea623e4e5a97210`: Chromium 154; all four recorded steps completed; DOM/accessibility captured; owned browser terminated. Full record: `evidence/tspot-capture.json`. Scenario: `tspot-scenario.json`. |
| Do playback and collection controls work? | Observed independently | Six Playwright tests pass: actual audio time advances, seek changes media time, next selects the next queued track, pause stops media; search and empty state; create/add/reload playlist; persist likes/accent; mobile navigation without horizontal document overflow; all cover images load. These are ordinary browser-test results, not REA Evidence. |
| What did the initial reconstruction include? | Original demo scope | Local generated WAV files and browser local storage. The later Spotify integration is documented below; the original REA capture predates it. |

## Skill and tool identity

Installed skill source: `https://github.com/morluto/rea.git` commit `9e7e13fb7155a2fe6f672ddb4a17e40d1a9c4173`.
The active session had no REA MCP tools; read-only doctor reported missing registration. The documented CLI fallback was used without modifying managed client configuration or installing native engines.

## Validation

- Frozen dependency installation: `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` passed. An earlier attempt using the unwritable default home cache failed; moving the cache into the workspace resolved installation while preserving integrity verification.
- Production build: `npm run build` passed.
- Functional browser suite: `npm test`: 6 passed, 0 failed, 0 skipped.
- Desktop and mobile screenshots were visually inspected; SVG grain compositing was corrected to restore artwork contrast.
- Current Spotify parity remains unverified. Future parity work needs network access to the reference and its asset hosts; no Spotify functionality has been inferred from the failed capture.

## Later Spotify integration

An optional Spotify integration now uses Authorization Code + PKCE, random state validation, session-scoped tokens and refresh, catalog search, Spotify embeds, and Premium Spotify Connect controls. See `SPOTIFY-SETUP.md`. The original six demo tests and eight Spotify integration tests pass (14 total). Spotify tests simulate provider responses; they do not establish live Spotify access or playback. No Web Playback SDK or audio extraction is implemented.

## In-browser playback update

The latest version changes Play/title/artwork into inline selections, retains the official iframe, and optionally integrates the official Web Playback SDK with the bottom controls. The earlier statement that no SDK was implemented describes the previous snapshot. See `PLAYBACK-FIX.md` for the current behavior, 29-test suite and live-access limitations.
