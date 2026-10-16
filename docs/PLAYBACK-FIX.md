# TSPOT in-browser playback: findings and validation

## Why the old experience could leave TSPOT

In the inspected version, `SpotifyPanel.jsx` already had a **Listen** button that set the selected track and rendered Spotify's embed iframe. However, the song artwork and title were anchors to `open.spotify.com`, and explicit **Open in Spotify** links also left the app. The Spotify Connect section intentionally controlled another Spotify device. The bottom transport still belonged to the local demo audio; it did not control the Spotify iframe. There was no Web Playback SDK integration. An earlier downloaded ZIP may also differ from the cloud checkout.

This establishes the code paths, not which element was clicked on the user's Mac. The live user session was not inspected and no account credentials were available in this cloud environment.

## Resulting behavior

- **Play**, artwork and title now select the song inside TSPOT, with no anchor navigation or new tab. By default the selected track loads in `https://open.spotify.com/embed/track/<id>`.
- Only deliberate links labeled **Open in Spotify** (or the provenance link) navigate externally. Neither SDK nor API failures automatically open Spotify.
- The embedded player uses Spotify's own UI. The user may need a second click on its Play button. Spotify controls full playback, previews, login and restrictions inside the cross-origin player; TSPOT does not alter its internals or bypass them.
- Optional **Listen in this browser** uses only the official `https://sdk.scdn.co/spotify-player.js`. This is an alternative to the iframe, not a second simultaneous music source.
- The SDK creates **TSPOT · This browser**. Login, SDK loading and the `ready` event do not transfer or start playback. Only an explicit Play action activates browser audio, transfers playback to that exact SDK device with `play:false`, then requests the selected queue.
- The existing bottom player switches to Spotify metadata and actual SDK state. Play/pause, next/previous, seek and volume call the official SDK methods. Next/previous navigate the queued search results. Spotify's reported disallowed operations are disabled. State events plus a one-second state check keep the transport synchronized.
- Browser playback survives navigation around TSPOT. Selecting demo music, disconnecting Spotify, closing the Spotify player, or choosing the embed disconnects the SDK. Selecting Spotify stops demo audio. The iframe is removed when it should not play.
- Permission, Premium/app access, protected-media support, autoplay, offline-device, initialization, script loading and playback failures produce actionable messages. Fatal failures return to the embed. An autoplay error invites an explicit second Play click without redirecting.
- Login remains Authorization Code + PKCE, with refreshable tab-scoped tokens. Browser playback requests `streaming`, `user-read-email`, `user-read-private`, `user-read-playback-state`, and `user-modify-playback-state` through a separate user-initiated consent action. No Client Secret belongs in the frontend.
- Existing demo playlists, favorites, search, theme and library remain in place. Spotify search results are not silently written into the user's Spotify library.

## SDK access investigation and limits

The official Spotify example at https://github.com/spotify/spotify-web-playback-sdk-example was inspected at commit `d22700174073dec831635aac452acbf5b4186853`. Its source confirms the SDK host, streaming/private/email scopes, Player construction, ready/not_ready and state listeners, connection, and transport method pattern. This app retains PKCE rather than copying the example's server-based login.

Requests to the live Spotify SDK documentation and `sdk.scdn.co` returned HTTP 403 from this cloud network. There were no configured Spotify Client ID environment bindings or local `.env` credentials (only the blank public `.env.example`). The user's Spotify dashboard, developer-app mode/eligibility and Premium entitlement could not be queried. No attempt was made to read credentials from the user's Google/Spotify login page.

Premium alone does not prove that this particular developer app may stream. Runtime SDK connection, authorization scopes, protected-media support, and a successful playback attempt on the user's Mac must establish availability. See https://developer.spotify.com/documentation/web-playback-sdk and the app's developer dashboard for current access requirements. There is no fallback that downloads protected music, proxies audio, disables DRM, or opens Spotify automatically.

## Validation

`npm run build` passes. The 29 Playwright browser tests include:

- Play/title/artwork change the iframe URL; the top-level URL and tab count stay unchanged; no SDK or Web API playback starts in embed mode.
- SDK loads only after explicit enabling. The SDK gets a token through its callback, not a URL.
- `ready` alone makes no playback/transfer request. Explicit Play activates audio before transferring and starting the queue on the SDK device.
- All six required controls: play, pause, next, previous, seek and volume. Metadata follows state changes; library navigation retains playback.
- A separate streaming-permission consent request; invalid OAuth state rejection; refresh; revoked token handling; disconnect cleanup.
- Account, authentication, initialization, playback, autoplay, absent protected-media support, script-load and Web API access-denial failures.
- Disallowed SDK controls, demo/Spotify switching, demo playlists/favorites, mobile layout, search, persistence, and image loading.

Spotify responses, SDK events and media state are simulated in integration tests; these do not decrypt or stream music and are not proof of live Spotify eligibility. The local demo's real WAV playback is tested independently. Complete the Mac guide's live check to validate actual Spotify audio.
