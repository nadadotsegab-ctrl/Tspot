# Start the updated TSPOT on your Mac

1. Stop the old TSPOT Terminal command with **Control-C**. Keep your existing project as a backup; don't overwrite your own changes.
2. Extract **TSPOT-Browser-Playback.zip**. Put the new **REA** folder in **Downloads** (rename the old folder first if necessary).
3. Open Terminal and run:

   ```sh
   cd ~/Downloads/REA
   npm ci
   npm run dev -- --port 3000 --strictPort
   ```

4. Leave Terminal running and open **http://127.0.0.1:3000/** in a current Chrome or Safari browser on your Mac.
5. Click **Spotify**, paste your public developer **Client ID** if needed, and connect. The exact redirect URI in Spotify's dashboard must be **http://127.0.0.1:3000/callback**. Never paste a Client Secret into TSPOT.
6. Search for a song and click **Play**. Its official embedded player loads inside TSPOT. Use the Play button within that player; Spotify decides available playback.
7. For full browser playback, click **Allow browser playback** under **Listen in this browser** and approve the streaming permissions. After returning, select a song, click **Enable browser player**, wait for **Browser player ready**, then click **Play selected in browser**.
8. The bottom controls now handle Spotify play/pause, next/previous, seek, and volume, when Spotify permits them. Use **Use embedded player** if the SDK is restricted. Only explicit **Open in Spotify** links open Spotify externally.

Install Node.js LTS from https://nodejs.org/ if `npm` isn't available. If port 3000 is busy, stop the previous TSPOT server rather than switching ports.

Premium is necessary for the SDK, but app eligibility and browser protected-media support also matter. Live account/app eligibility could not be verified from Codex. The app displays Spotify failures and retains the embed; it does not bypass protected playback. Full setup and troubleshooting: `docs/SPOTIFY-SETUP.md`. Developer/validation details: `docs/PLAYBACK-FIX.md`.

Your existing local playlists/favorites stay in browser local storage for the same origin and browser profile; the project update does not clear them. Data saved under localhost is separate from data saved under 127.0.0.1.
