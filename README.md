# TSPOT — Let’s build it together

**Let’s collaborate to build TSPOT: a free, community-built music app inspired by Spotify.**

The goal is a music companion that anyone can run, customize, and help improve. Designers, developers, testers, and music fans are welcome—whether you’re experienced or just getting started.

## Collaborate with us

Have an idea or want to help? [Open an issue](https://github.com/nadadotsegab-ctrl/REA/issues) to introduce yourself, suggest a feature, or report a bug. Fork the repository and submit a pull request when you’re ready to contribute.

We’d love help with the interface, accessibility, playlists, discovery, tests, documentation, and integrations using officially supported APIs and properly licensed music.

**Free app, permitted playback:** TSPOT is free to run and develop. Spotify-connected features follow Spotify’s developer policies and account requirements; full playback through its Web Playback SDK requires Spotify Premium and app access. TSPOT is an independent project and does not unlock Premium features for free.

## About the app

A custom Spotify-style music web app built with React and Vite. TSPOT includes a responsive home page, curated mixes, track search, a library, liked songs, personal playlists, queue controls, shuffle, repeat, seeking, volume, an expanded player, and three accent colors. Favorites, playlists, and accent preferences persist in browser local storage.

## Run

Requires Node.js 22+ (validated with Node.js 24.19.0).

```sh
npm ci
npm run dev -- --port 3000
```

In the managed cloud environment, use `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` because the default home npm cache is outside the writable workspace.

```sh
npm run build
npm test
```

The Playwright tests use the installed `/usr/bin/chromium`. For other machines, change `launchOptions.executablePath` in `playwright.config.js` to an installed Chromium-family browser or use Playwright's bundled Chromium. The test runner starts the development server if necessary.

## Connect Spotify

See [the beginner Spotify setup guide](docs/SPOTIFY-SETUP.md). Start the app at `http://127.0.0.1:3000/` and click **Spotify**. Paste your public Spotify developer Client ID, then authorize with PKCE. Never put a Client Secret into the frontend. Search uses the Spotify Web API; Play loads the official embed inside TSPOT. Optional **Listen in this browser** uses Spotify’s official Web Playback SDK and connects the bottom player controls; Premium, streaming permissions, app eligibility and protected-media browser support are required. Other-device Spotify Connect remains optional.

Spotify tokens are kept in this tab’s session storage and cleared on Disconnect. The browser can refresh expiring tokens. Live account testing remains pending because cloud access to Spotify is blocked; browser tests simulate its responses.

The latest playback findings and the 29-test validation boundary are documented in [docs/PLAYBACK-FIX.md](docs/PLAYBACK-FIX.md). Live SDK access for your account/app remains unverified; the integration tests simulate Spotify.

## Content and customization

- App UI and behavior: `src/main.jsx`
- Colors, typography and responsive layout: `src/style.css`
- Tracks, durations and curated playlists: `src/data.js`
- Artwork and original synthesized audio: `public/art` and `public/audio`
- Optional asset regeneration: `python3 scripts/generate-assets.py` (standard library only)

The profile button opens accent settings. Use **+** beside a track to add it to your own playlist, **heart** to save it, **Space** to play/pause outside inputs, and **/** to focus search. Dialogs support Escape and keyboard focus containment.

The original demo collection uses independent local instrumental loops. The optional Spotify integration adds account authorization, catalog search and permitted playback through Spotify. There is no authentication server or cross-device synchronization for TSPOT’s own playlists/favorites. The demo browser storage belongs to this app and device.

## Reverse engineering evidence

The installed `reverse-engineer-anything` skill guided the investigation and validation. Direct Spotify access returned a proxy 403; REA's browser scenario also failed before capturing the initial Spotify state. This app therefore recreates familiar music-player patterns with a custom TSPOT design; current Spotify visual or behavioral parity has not been established.

See `docs/RECONSTRUCTION.md` for the evidence ledger. A successful REA browser scenario and independent functional browser tests validate TSPOT's own behavior. Neither establishes Spotify parity.
