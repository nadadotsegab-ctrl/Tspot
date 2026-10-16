// Browser-only Spotify Authorization Code + PKCE. Never supply a client secret.
const TOKEN_KEY = 'tspot-spotify-session';
const FLOW_KEY = 'tspot-spotify-pkce';
const CONFIG_KEY = 'tspot-spotify-config';
export const PLAYBACK_SCOPES = ['user-read-playback-state', 'user-modify-playback-state'];
export const SDK_SCOPES = [...PLAYBACK_SCOPES, 'streaming', 'user-read-email', 'user-read-private'];
let refreshing = null;
let authGeneration = 0;

const read = (store, key) => {
  try { return JSON.parse(store.getItem(key)) } catch { return null }
};
export function readConfig() {
  const saved = read(localStorage, CONFIG_KEY);
  return {
    clientId: saved?.clientId || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
    redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/callback',
  };
}
export function saveClientId(clientId) {
  const value = clientId.trim();
  if (!/^[a-f\d]{32}$/i.test(value)) throw new Error('Copy the 32-character Client ID from your Spotify app settings. Do not use the Client Secret.');
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ clientId: value }));
  return value;
}
export function readSession() {
  const session = read(sessionStorage, TOKEN_KEY);
  return session?.accessToken && session?.clientId && session?.expiresAt ? session : null;
}
export function disconnectSpotify() {
  authGeneration++;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(FLOW_KEY);
}
function randomString() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function validateRedirect(redirectUri) {
  let url;
  try { url = new URL(redirectUri) } catch { throw new Error('The Spotify redirect URI must be a complete URL.'); }
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')) || url.search || url.hash || url.username || url.password) {
    throw new Error('Use http://127.0.0.1:3000/callback for local setup, or an HTTPS callback for deployment.');
  }
  if (url.origin !== location.origin) {
    throw new Error(`Open TSPOT at ${url.origin} before connecting. The callback must use the same origin as the website.`);
  }
}
export async function beginSpotifyLogin(clientId, playback = false, browserPlayback = false) {
  const validatedId = saveClientId(clientId);
  const { redirectUri } = readConfig();
  validateRedirect(redirectUri);
  if (!crypto.subtle) throw new Error('Spotify login needs a secure browser context. Use the local 127.0.0.1 address or HTTPS.');
  const verifier = randomString();
  const state = randomString();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const scopes = browserPlayback ? SDK_SCOPES : playback ? PLAYBACK_SCOPES : [];
  sessionStorage.setItem(FLOW_KEY, JSON.stringify({ verifier, state, clientId: validatedId, redirectUri, createdAt: Date.now(), scopes }));
  const params = new URLSearchParams({ response_type: 'code', client_id: validatedId, redirect_uri: redirectUri, state, code_challenge_method: 'S256', code_challenge: challenge });
  if (scopes.length) params.set('scope', scopes.join(' '));
  location.assign(`https://accounts.spotify.com/authorize?${params}`);
}
async function tokenRequest(params) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) throw new Error('Spotify could not complete login. Connect again and check the Client ID and exact redirect URI in your Spotify dashboard.');
    throw new Error('Spotify login is temporarily unavailable. Please try again.');
  }
  const data = await response.json();
  if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('Spotify returned an incomplete login response. Please reconnect.');
  return data;
}
function saveToken(data, previous) {
  const session = { accessToken: data.access_token, refreshToken: data.refresh_token || previous.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000, clientId: previous.clientId,
    scopes: typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : previous.scopes || [] };
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  return session;
}
export async function completeSpotifyLogin() {
  const url = new URL(location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) return readSession();
  const flow = read(sessionStorage, FLOW_KEY);
  sessionStorage.removeItem(FLOW_KEY);
  const code = url.searchParams.get('code'), state = url.searchParams.get('state'), denied = url.searchParams.has('error');
  // Remove authorization material from the address bar even if validation fails.
  ['code', 'state', 'error', 'error_description'].forEach(key => url.searchParams.delete(key));
  if (url.pathname === '/callback') url.pathname = '/';
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  if (!flow || !state || flow.state !== state || !flow.verifier || Date.now() - flow.createdAt > 600000 || Date.now() < flow.createdAt) {
    throw new Error('This Spotify login expired or could not be verified. Please connect again from this tab.');
  }
  if (denied) throw new Error('Spotify permission was declined. You can keep using demo music or connect again.');
  validateRedirect(flow.redirectUri);
  const generation = authGeneration;
  const data = await tokenRequest(new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: flow.redirectUri, client_id: flow.clientId, code_verifier: flow.verifier }));
  if (generation !== authGeneration) throw new Error('Spotify was disconnected.');
  return saveToken(data, flow);
}
export async function getSpotifyAccessToken() {
  const session = readSession();
  if (!session) throw new Error('Connect Spotify to search its catalog.');
  if (Date.now() < session.expiresAt - 60000) return session.accessToken;
  if (!session.refreshToken) { disconnectSpotify(); throw new Error('Your Spotify login expired. Connect again.'); }
  if (!refreshing) {
    const generation = authGeneration;
    refreshing = tokenRequest(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refreshToken, client_id: session.clientId }))
      .then(data => { if (generation !== authGeneration) throw new Error('Spotify was disconnected.'); return saveToken(data, session).accessToken; })
      .catch(error => { if (generation === authGeneration) disconnectSpotify(); throw error; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}
export async function spotifyRequest(path, options = {}) {
  // The path is constructed by this module; bearer tokens go only to Spotify's API.
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid Spotify API path.');
  const token = await getSpotifyAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options, signal: options.signal || AbortSignal.timeout(15000),
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    let message;
    if (response.status === 401) { disconnectSpotify(); message = 'Spotify login expired or was revoked. Connect again.'; }
    else if (response.status === 403) message = 'Spotify denied this request. Check app access in the developer dashboard. Playback controls also require Spotify Premium and playback permission.';
    else if (response.status === 404) message = 'Spotify could not find the selected playback device. Reconnect the browser player, or refresh your Spotify devices.';
    else if (response.status === 429) {
      const seconds = Number(response.headers.get('Retry-After'));
      message = `Spotify’s rate limit was reached.${seconds > 0 ? ` Try again in ${Math.ceil(seconds)} seconds.` : ' Wait a little before trying again.'}`;
    } else message = 'Spotify could not complete the request. Please try again.';
    // Log neither tokens nor raw provider responses. Surface actionable stable messages.
    const error = new Error(message); error.status = response.status;
    if (details?.error?.reason === 'PREMIUM_REQUIRED') error.message = 'Spotify Premium is required for these playback controls. You can still open the song on Spotify or use its embedded player.';
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
export async function searchSpotify(query, signal) {
  const params = new URLSearchParams({ q: query.trim(), type: 'track', limit: '10' });
  const data = await spotifyRequest(`/search?${params}`, { signal });
  return (data.tracks?.items || []).filter(track => track && /^[a-zA-Z0-9]{22}$/.test(track.id)).map(track => ({
    id: track.id, name: track.name, artist: track.artists?.map(artist => artist.name).join(', ') || 'Unknown artist',
    album: track.album?.name || '', image: track.album?.images?.[0]?.url || '',
    duration: track.duration_ms || 0, uri: `spotify:track:${track.id}`,
    url: `https://open.spotify.com/track/${track.id}`, explicit: Boolean(track.explicit),
  }));
}
export const getSpotifyDevices = () => spotifyRequest('/me/player/devices');
export const startSpotifyTrack = (track, deviceId) => spotifyRequest(`/me/player/play${deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uris: [track.uri] }),
});
export const pauseSpotify = deviceId => spotifyRequest(`/me/player/pause${deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''}`, { method: 'PUT' });

export const transferToBrowser = deviceId => spotifyRequest('/me/player', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ device_ids: [deviceId], play: false }),
});
export const startBrowserQueue = (list, index, deviceId) => spotifyRequest(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ uris: list.map(track => track.uri), offset: { position: index }, position_ms: 0 }),
});
