import React, {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Check, ExternalLink, Headphones, LoaderCircle, LogOut, MonitorSpeaker, Pause, Play, RefreshCw, Search, X} from 'lucide-react';
import {beginSpotifyLogin, completeSpotifyLogin, disconnectSpotify, readConfig, readSession, searchSpotify, getSpotifyDevices, startSpotifyTrack, pauseSpotify, PLAYBACK_SCOPES, SDK_SCOPES} from './spotify';
import {fmt} from './data';

export default function SpotifyPanel({query, onPlayback, playback}) {
  const [session,setSession] = useState(readSession);
  const [clientId,setClientId] = useState(()=>readConfig().clientId);
  const [enablePlayback,setEnablePlayback] = useState(true);
  const [initializing,setInitializing] = useState(true);
  const [connecting,setConnecting] = useState(false);
  const [error,setError] = useState('');
  const [results,setResults] = useState([]);
  const [searching,setSearching] = useState(false);
  const [retry,setRetry] = useState(0);
  const selected=playback.selected;
    const [devices,setDevices] = useState([]);
  const [deviceId,setDeviceId] = useState('');
  const [deviceBusy,setDeviceBusy] = useState(false);
  const [deviceError,setDeviceError] = useState('');
  const [status,setStatus] = useState('');
  const mounted = useRef(true);
  const browserAllowed = SDK_SCOPES.every(scope=>session?.scopes?.includes(scope));
  const allowedPlayback = PLAYBACK_SCOPES.every(scope=>session?.scopes?.includes(scope));
  const localOrigin = location.origin;
  let targetOrigin = '';
  try { targetOrigin = new URL(readConfig().redirectUri).origin } catch { /* Login validation reports a malformed redirect URI. */ }
  const wrongOrigin = Boolean(targetOrigin && localOrigin !== targetOrigin);

  useEffect(()=>{
    mounted.current=true;
    completeSpotifyLogin().then(value=>{if(mounted.current)setSession(value)}).catch(err=>{if(mounted.current)setError(err.message)}).finally(()=>{if(mounted.current)setInitializing(false)});
    return()=>{mounted.current=false};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    setResults([]);setSearching(false);
    if(!session||initializing||!query.trim())return()=>controller.abort();
    setError('');setSearching(true);
    const timer=setTimeout(()=>{
      searchSpotify(query,controller.signal).then(items=>{if(!controller.signal.aborted)setResults(items)}).catch(err=>{
        if(!controller.signal.aborted){setError(err.message);if(!readSession())setSession(null)}
      }).finally(()=>{if(!controller.signal.aborted)setSearching(false)});
    },400);
    return()=>{clearTimeout(timer);controller.abort()};
  },[query,session,initializing,retry]);

  async function connect(controls=enablePlayback,browser=false){
    setError('');setConnecting(true);
    try{await beginSpotifyLogin(clientId,controls,browser)}catch(err){setError(err.message);setConnecting(false)}
  }
  function disconnect(){
    disconnectSpotify();playback.reset();setSession(null);setResults([]);setDevices([]);setDeviceId('');setDeviceError('');setStatus('');
  }
  async function loadDevices(){
    setDeviceBusy(true);setDeviceError('');setStatus('');
    try{
      const response=await getSpotifyDevices();
      if(!mounted.current||!readSession())return;
      const available=(response?.devices||[]).filter(d=>d.id&&!d.is_restricted&&d.id!==playback.deviceId);
      setDevices(available);setDeviceId(available.find(d=>d.is_active)?.id||available[0]?.id||'');
      if(!available.length)setDeviceError('No available devices yet. Open Spotify, play a song there, then click Refresh devices.');
    }catch(err){if(mounted.current){setDeviceError(err.message);if(!readSession())setSession(null)}}
    finally{if(mounted.current)setDeviceBusy(false)}
  }
  async function remoteAction(pause=false){
    if(!deviceId||(!pause&&!selected))return;
    setDeviceBusy(true);setDeviceError('');setStatus('');
    try{
      if(pause)await pauseSpotify(deviceId);
      else{playback.embed();onPlayback();await startSpotifyTrack(selected,deviceId)}
      if(mounted.current&&readSession())setStatus(pause?'Pause command sent to Spotify.':'Play command sent to Spotify. Listen on your selected device.');
    }catch(err){if(mounted.current){setDeviceError(err.message);if(!readSession())setSession(null)}}
    finally{if(mounted.current)setDeviceBusy(false)}
  }
  function selectTrack(track){onPlayback();playback.selectTrack(track,results);setStatus('');setDeviceError('');requestAnimationFrame(()=>document.getElementById('spotify-listen-section')?.scrollIntoView({block:'nearest',behavior:'smooth'}))}

  return <section className="spotify-panel" aria-labelledby="spotify-title">
    <div className="page-greeting"><div><span className="eyebrow">YOUR SPOTIFY CONNECTION</span><h1 id="spotify-title">Find it on Spotify<span>.</span></h1></div><a className="spotify-attribution" href="https://open.spotify.com/" target="_blank" rel="noreferrer">Spotify <ArrowUpRight size={15}/></a></div>
    <p className="spotify-intro">Search Spotify’s catalog and listen here using the official embed or optional browser player.</p>
    {error&&<div className="spotify-error" role="alert">{error}{session&&<button className="outline-button" onClick={()=>setRetry(n=>n+1)}>Try again</button>}</div>}
    {initializing?<p className="spotify-loading" role="status"><LoaderCircle size={18} className="spin"/>Checking Spotify connection…</p>:!session?<div className="spotify-connect-card">
      <Headphones size={27}/><h2>Connect your Spotify account</h2>
      <p>One-time setup: create a Spotify developer app, then paste its public Client ID below. Your password stays with Spotify.</p>
      <ol><li>Open the <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify Developer Dashboard <ExternalLink size={12}/></a> and create your app.</li><li>Add this exact redirect URI in the app settings:<code>{readConfig().redirectUri}</code></li><li>Save the app settings and copy the <strong>Client ID</strong>.</li></ol>
      <form onSubmit={e=>{e.preventDefault();connect()}}>
        <label htmlFor="spotify-client-id">Spotify Client ID <span>Public ID — never paste a Client Secret</span></label>
        <input id="spotify-client-id" value={clientId} onChange={e=>setClientId(e.target.value)} placeholder="Paste your 32-character Client ID" autoComplete="off" spellCheck="false" required/>
        <label className="spotify-checkbox"><input type="checkbox" checked={enablePlayback} onChange={e=>setEnablePlayback(e.target.checked)}/><span>Allow Spotify Connect controls <small>Premium required; controls an existing Spotify device.</small></span></label>
        {wrongOrigin&&<p className="spotify-origin-note">Before connecting, open this app at <a href={targetOrigin}>{targetOrigin}</a> on your Mac. Spotify’s local callback uses 127.0.0.1, not localhost.</p>}
        <button className="primary-button" type="submit" disabled={connecting||wrongOrigin}>{connecting?<LoaderCircle size={16} className="spin"/>:<ArrowUpRight size={16}/>}Connect Spotify</button>
      </form>
      <p className="spotify-fine-print">Developer-mode apps have Spotify access restrictions. If login is refused, check your app’s dashboard, account eligibility, and allowed users. <a href="/SPOTIFY-SETUP.html" target="_blank" rel="noreferrer">Read the setup guide</a>.</p>
    </div>:<>
      <div className="spotify-connected"><span><Check size={16}/>Connected to Spotify</span><span className="spotify-session-note">This browser tab</span><button className="outline-button" onClick={()=>connect(allowedPlayback,browserAllowed)} disabled={connecting}>Reconnect Spotify</button><button className="outline-button" onClick={disconnect}><LogOut size={13}/>Disconnect</button></div>
      <div className="spotify-search-results" aria-live="polite" aria-busy={searching}>
        {searching?<p className="spotify-loading"><LoaderCircle size={18} className="spin"/>Searching Spotify…</p>:!query.trim()?<div className="spotify-empty"><Search size={31}/><h2>What do you want to hear?</h2><p>Type a song or artist into the search bar at the top.</p></div>:!error&&!results.length?<div className="spotify-empty"><h2>No Spotify tracks found</h2><p>Try another song or artist.</p></div>:null}
        {results.length>0&&<><p className="spotify-result-caption">Results from Spotify · Showing up to 10 tracks</p><div className="spotify-results">{results.map(track=><article className={`spotify-track ${selected?.id===track.id?'selected':''}`} key={track.id}>
          <button type="button" onClick={()=>selectTrack(track)} className="spotify-track-art" aria-label={`Select ${track.name} artwork`}>{track.image?<img src={track.image} alt={`${track.album} cover`} loading="lazy"/>:<Headphones size={24}/>}</button>
          <div className="spotify-track-info"><button type="button" onClick={()=>selectTrack(track)} aria-label={`Select ${track.name}`}><strong>{track.name}</strong></button><span>{track.explicit&&<b className="explicit-badge" aria-label="Explicit">E</b>}{track.artist}</span><small>{track.album}</small></div>
          <span className="spotify-duration">{fmt(track.duration/1000)}</span><button className="outline-button" onClick={()=>selectTrack(track)} aria-label={`Play ${track.name}`}><Play size={13}/>Play</button><a className="icon-btn" href={track.url} target="_blank" rel="noreferrer" aria-label={`Open ${track.name} in Spotify (external)`}><ExternalLink size={16}/></a>
        </article>)}</div></>}
      </div>
    </>}
    {selected&&session&&<section id="spotify-listen-section" className="spotify-listen" aria-labelledby="spotify-listen-title"><div className="section-heading"><div><h2 id="spotify-listen-title">Listen with Spotify</h2><p>{selected.name} · {selected.artist}</p></div><button aria-label="Close Spotify player" onClick={playback.reset}><X size={19}/></button></div>
      {playback.active&&playback.mode==='embed'&&<iframe id="spotify-embedded-player" key={selected.id} title={`Spotify player: ${selected.name}`} src={`https://open.spotify.com/embed/track/${selected.id}?utm_source=generator`} height="152" width="100%" style={{border:0,borderRadius:12}} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>}
      {playback.error&&<p className="spotify-error" role="alert">{playback.error}</p>}
      <div className="spotify-browser-device"><h3><MonitorSpeaker size={19}/>Listen in this browser <span>PREMIUM</span></h3><p>The official Spotify Web Playback SDK can use TSPOT’s bottom player controls when Spotify permits this account, app, and browser.</p>
        {!browserAllowed?<button className="primary-button" disabled={connecting} onClick={()=>connect(true,true)}>Allow browser playback <ArrowUpRight size={14}/></button>:<div className="spotify-device-buttons">
          <button className="primary-button" disabled={['loading','connecting'].includes(playback.status)||playback.status==='ready'} onClick={playback.connectBrowser}>{['loading','connecting'].includes(playback.status)?<LoaderCircle size={14} className="spin"/>:<MonitorSpeaker size={14}/>} {playback.status==='ready'?'Browser player ready':'Enable browser player'}</button>
          {playback.status==='ready'&&<button className="primary-button" disabled={playback.busy} onClick={()=>playback.playBrowser()}><Play size={14}/>Play selected in browser</button>}
        </div>}
        {playback.mode==='browser'&&playback.status==='ready'&&<p className="spotify-command-status" role="status">Browser device ready. Click Play to start; the bottom controls follow Spotify’s actual playback state.</p>}
        <button className="outline-button" onClick={playback.embed}>Use embedded player</button>
      </div>
      <p className="spotify-fine-print">This is Spotify’s official player. Spotify determines available playback based on your login, region, account, and browser. TSPOT does not extract or rehost Spotify audio. In embed mode, use the player’s own Play button; available playback is controlled by Spotify.</p>
      <a className="outline-button" href={selected.url} target="_blank" rel="noreferrer">Open in Spotify <ExternalLink size={13}/></a>
      <div className="spotify-device"><h3><MonitorSpeaker size={19}/>Other Spotify devices <span>OPTIONAL</span></h3><p>Play this song in the Spotify app on your Mac or phone. Open Spotify and start a song there first.</p>
        {!allowedPlayback?<button className="primary-button" disabled={connecting} onClick={()=>connect(true)}>Enable playback controls <ArrowUpRight size={14}/></button>:<>
          <div className="spotify-device-row"><button className="outline-button" disabled={deviceBusy} onClick={loadDevices}><RefreshCw size={14} className={deviceBusy?'spin':''}/>Refresh devices</button>{devices.length>0&&<label>Playback device<select aria-label="Spotify playback device" value={deviceId} onChange={e=>setDeviceId(e.target.value)}>{devices.map(device=><option key={device.id} value={device.id}>{device.name}{device.is_active?' · active':''}</option>)}</select></label>}</div>
          <div className="spotify-device-buttons"><button className="primary-button" disabled={!deviceId||deviceBusy} onClick={()=>remoteAction()}><Play size={14} fill="currentColor"/>Play on device</button><button className="outline-button" disabled={!deviceId||deviceBusy} onClick={()=>remoteAction(true)}><Pause size={14}/>Pause on Spotify</button></div>
        </>}
        {deviceError&&<p className="spotify-error" role="alert">{deviceError}</p>}{status&&<p className="spotify-command-status" role="status"><Check size={16}/>{status}</p>}
      </div>
    </section>}
    <p className="spotify-fine-print spotify-footer-note">Demo favorites and playlists stay local to TSPOT. This connection does not change your Spotify library. Disconnect clears this tab’s Spotify tokens; you can also remove access from your Spotify account’s Apps settings.</p>
  </section>;
}
