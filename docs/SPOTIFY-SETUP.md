# Connect TSPOT to Spotify on your Mac

This version adds Spotify catalog search, Spotify's official embedded player, optional Web Playback SDK controls inside TSPOT, and optional Spotify Connect controls on another device. You said you have Spotify Premium, which is required for the Connect controls. You do not need a Client Secret, backend server, or paid hosting for local development.

## 1. Open the updated project

If you downloaded an earlier TSPOT ZIP, it does not include this integration. Download **TSPOT-Browser-Playback.zip** from this conversation. Keep your old REA folder as a backup: stop its running Terminal command with **Control-C**, then rename the old folder to **REA-old** in Finder before extracting the new ZIP in Downloads. Double-click the new ZIP to extract a fresh **REA** folder. Do not overwrite personal changes blindly.

Open Terminal (Command-Space, type Terminal, press Return), then paste these commands and press Return:

```sh
cd ~/Downloads/REA
npm ci
npm run dev -- --port 3000 --strictPort
```

Leave Terminal open. If Node/npm is missing, install the current Node.js LTS installer from https://nodejs.org/ first, then reopen Terminal. If port 3000 is in use, stop your previous TSPOT Terminal command with Control-C. Do not let Vite silently switch ports; the Spotify callback must match.

Open **http://127.0.0.1:3000/** in Chrome or Safari on your Mac. Use this exact address, rather than localhost, for Spotify login. Both refer to your Mac, but they are different browser origins and Spotify does not accept localhost as a loopback redirect URI.

## 2. Create your Spotify developer app

1. Open https://developer.spotify.com/dashboard and sign in with your Spotify account.
2. Choose **Create app** if your account is eligible. Enter **TSPOT** as the app name and **Personal music search and playback** as the description. Fill any other required fields honestly. If asked for a website, use your local TSPOT address if the dashboard accepts it; website and redirect URI are separate fields.
3. In **Redirect URIs**, add exactly:

   ```text
   http://127.0.0.1:3000/callback
   ```

4. Select **Web API** if asked which APIs you plan to use. Also select **Web Playback SDK** if the dashboard offers that option and you want full browser playback.
5. Review Spotify's applicable developer terms yourself and create/save the app.
6. Open the app's **Settings** and confirm that the exact redirect URI above was saved. Copy its **Client ID**. It is a public, 32-character identifier. Do not reveal or paste the **Client Secret** anywhere in TSPOT.
7. If the dashboard requires allowed users for a development-mode app, add the Spotify account you will sign in with under **User Management** or the corresponding current access settings. App eligibility, user limits, Premium requirements and available endpoints are controlled by Spotify and can change. If Create app or the required access is unavailable, resolve that in the dashboard; the website cannot bypass it.

Dashboard labels may change. The essential settings are Web API access, the Client ID, the exact redirect URI, and access for the Spotify user who signs in.

## 3. Connect inside TSPOT

1. Return to **http://127.0.0.1:3000/**.
2. Click **Spotify** at the top right (the music-note icon on a small screen).
3. Paste the **Client ID** into the **Spotify Client ID** box.
4. Keep **Allow Spotify Connect controls** checked for your Premium account. Unchecking it requests search-only access.
5. Click **Connect Spotify**. The browser goes to Spotify's real login/authorization page.
6. Sign in on Spotify and approve the permissions you want to grant. You return to TSPOT and should see **Connected to Spotify**.

No secret needs to be sent in chat. Your Client ID is saved in this browser's local storage. Spotify access and refresh tokens stay in this tab's session storage; the site refreshes expiring access tokens when needed. Closing the tab or clicking Disconnect may require a new login. Login state must stay in the same browser tab and origin through the redirect.

## 4. Search for real songs

1. With Spotify selected, type a song or artist into the search bar at the top.
2. TSPOT displays up to ten results from the Spotify Web API. Availability varies by account and region.
3. Click **Play** beside a song to show Spotify's official embedded player.
4. Use the controls inside that player, or choose **Open in Spotify**.

Spotify determines whether its embed offers full playback, limited playback, a preview, or an external link for the current account/browser/region. TSPOT does not fetch, download, extract, or rehost Spotify audio, and it does not promise full in-browser playback. This app does not use preview URLs as a substitute streaming service.

## 5. Try full playback inside TSPOT with Premium

The embedded player always stays inside TSPOT when selected, but Spotify determines its available playback. For TSPOT's own bottom controls to handle Spotify audio, enable the official Web Playback SDK:

1. Use the updated app in a current supported browser on your Mac. Try Chrome or Safari if the Codex in-app browser cannot initialize protected content.
2. In TSPOT's Spotify search, click **Play** beside a result. This loads the official embed; it does not open Spotify or start a device automatically. Click the Play button inside that embed for its permitted playback.
3. Under **Listen in this browser**, click **Allow browser playback** if shown. This explicit action goes to Spotify's permission screen; Play itself does not redirect. Approve the additional streaming permissions if you want them. You return to TSPOT.
4. Search/select the song again if the authorization round trip cleared the selection.
5. Click **Enable browser player**. TSPOT loads Spotify's official SDK. It should show **Browser player ready**. Enabling it does not start music.
6. Click **Play selected in browser**, or the bottom player's **Play** button. Spotify should play in this browser tab using the device named **TSPOT · This browser**, if the account/app/browser/track permits it.
7. Use the bottom controls for play/pause, next, previous, the seek bar, mute and volume. Next/previous follow the search-result queue loaded on Play. If Spotify disallows a control, TSPOT disables it.
8. If a browser blocks automatic audio, click Play again. If Spotify rejects browser playback, read the visible message and choose **Use embedded player**. No failure automatically sends you to the Spotify app.

The SDK needs Premium, Spotify developer-app eligibility, the granted streaming/playback scopes, and supported encrypted-media playback. Having Premium alone does not prove this particular app is authorized. Check the app dashboard for current access and allowed-user requirements. This cloud environment cannot verify your live account or app; the real check is SDK readiness plus actual audio on your Mac. No Client Secret is needed.

The player deliberately reports Spotify's actual state rather than claiming music is playing immediately after an HTTP success. Switching to demo tracks stops/disconnects browser Spotify playback. Disconnect or Close Spotify player also tears it down. Existing playlists and favorites remain local and are not deleted.

## 6. Optionally use a different Premium Spotify device

1. Open the **Spotify app** on your Mac or phone, signed into the same account.
2. Start any song in Spotify so the device becomes available.
3. In TSPOT, select a search result with **Play**.
4. Scroll to **Other Spotify devices**, click **Refresh devices**, then choose your Mac or phone.
5. Click **Play on device**. The selected song should play in Spotify on that device.
6. Click **Pause on Spotify** to send a pause command.

The **Play on device** button deliberately controls a different Spotify device. To stay in this browser, use **Listen in this browser** and the bottom Spotify controls instead. If you originally chose search-only access, click **Enable playback controls** and approve the extra permissions. Login never starts playback automatically.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| `ERR_CONNECTION_REFUSED` | Start the Vite command on your Mac and leave Terminal open. The Codex cloud server is a different computer. |
| Redirect URI / invalid client error | Compare the dashboard and TSPOT values character for character. Use `http://127.0.0.1:3000/callback`, with no trailing slash. Confirm you copied the Client ID, not the Client Secret. |
| Open TSPOT at a different origin | Open `http://127.0.0.1:3000/`, then connect from there. Don't begin at localhost and return to 127.0.0.1. |
| Login expired or could not be verified | Start Connect Spotify again in the same tab; a callback can't be reused, and a login flow expires after ten minutes. Don't share callback links. |
| Spotify denied the request / 403 | Check app access and allowed users in the Spotify developer dashboard. Playback also requires Premium and the requested playback permissions. |
| No playback device | Start a song in the official Spotify app with the same account, then refresh devices. Restricted devices cannot be controlled. |
| Rate limit | Wait for the suggested interval, then use Try again. Repeated rapid searches can hit Spotify's limits. |
| Browser SDK unavailable or restricted | Check the visible error, Premium/app access, streaming permissions and browser protected-content support. Try current Chrome/Safari or choose Use embedded player. |
| Embed unavailable or limited | Try Open in Spotify. Check Spotify login, account, region and browser settings. TSPOT cannot override Spotify's playback restrictions. |
| Login expired / revoked | Connect again. To fully revoke authorization, remove TSPOT at https://www.spotify.com/account/apps/. |

## For deployment later

Configure a stable HTTPS origin and register its exact callback URI in Spotify. Optional Vite variables are documented in `.env.example`: `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI`. Restart Vite after changing `.env.local`, and rebuild when changing deployment variables. Everything prefixed `VITE_` is public browser code; never put a Client Secret in it. Configure the production host to serve `index.html` for the `/callback` route as well. Browser OAuth is implemented with Authorization Code + PKCE (S256), random state validation and token refresh. Spotify data isn't added to demo favorites/playlists or synchronized to your Spotify library.

## Official references and validation boundary

- Dashboard: https://developer.spotify.com/dashboard
- PKCE: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- Redirect URIs: https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
- Quota modes/access rules: https://developer.spotify.com/documentation/web-api/concepts/quota-modes
- Search endpoint: https://developer.spotify.com/documentation/web-api/reference/search
- Start playback: https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback
- Embeds: https://developer.spotify.com/documentation/embeds
- Developer policy: https://developer.spotify.com/policy

The cloud network blocked live Spotify documentation, login and API requests. Automated browser tests use simulated Spotify responses to verify the integration's requests and UI; they do not establish a successful connection to your account, live API availability, or current Spotify dashboard eligibility. Complete the setup above to validate live search and permitted playback on your Mac. Consult Spotify's live documentation and terms if its dashboard differs.

Spotify’s official PKCE example was inspected from https://github.com/spotify/web-api-examples/tree/master/authorization/authorization_code_pkce at commit `7c4872d343a6f29838c437cf163012947b4bffb9` to confirm the OAuth request shape. The example includes older setup text; use Spotify’s current dashboard requirements for redirect URI and eligibility decisions.
