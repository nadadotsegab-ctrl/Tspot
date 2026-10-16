// Only Spotify's official browser SDK handles protected media.
let loading;
export function loadSpotifySDK() {
  if (window.Spotify?.Player) return Promise.resolve(window.Spotify);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const previous = window.onSpotifyWebPlaybackSDKReady;
    let finished = false;
    function finish(error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      script.onerror = null;
      window.onSpotifyWebPlaybackSDKReady = previous;
      if (error) { script.remove(); loading = null; reject(error); }
      else resolve(window.Spotify);
    }
    const timer = setTimeout(() => finish(new Error('Spotify’s browser player did not load. Check access to sdk.scdn.co or use the embedded player.')), 15000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      try { previous?.(); } catch { /* Another integration cannot block this loader. */ }
      if (window.Spotify?.Player) finish();
      else finish(new Error('Spotify’s browser player is unavailable. The embedded player remains available.'));
    };
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.dataset.tspotSpotifySdk = 'true';
    script.onerror = () => finish(new Error('Spotify’s browser player was blocked or could not load. Try a supported browser or use the embedded player.'));
    document.head.appendChild(script);
  });
  // A failed load can be retried only by another explicit user action.
  return loading;
}
