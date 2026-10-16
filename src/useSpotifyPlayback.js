import {useCallback, useEffect, useRef, useState} from 'react';
import {loadSpotifySDK} from './spotify-sdk';
import {getSpotifyAccessToken, readSession, SDK_SCOPES, transferToBrowser, startBrowserQueue} from './spotify';

export function useSpotifyPlayback({onStart}) {
  const [active,setActive]=useState(false), [selected,setSelected]=useState(null), [queue,setQueue]=useState([]);
  const [mode,setMode]=useState('embed'), [status,setStatus]=useState('idle'), [error,setError]=useState('');
  const [state,setState]=useState(null), [volume,setVolume]=useState(.65), [busy,setBusy]=useState(false);
  const player=useRef(null), device=useRef(null), generation=useRef(0), readyTimer=useRef(null);
  const onStartRef=useRef(onStart);onStartRef.current=onStart;
  const selectedRef=useRef(selected);selectedRef.current=selected;
  const queueRef=useRef(queue);queueRef.current=queue;
  const volumeRef=useRef(volume);volumeRef.current=volume;

  const dispose=useCallback(()=>{
    generation.current++;clearTimeout(readyTimer.current);
    const instance=player.current;player.current=null;device.current=null;
    if(instance){
      instance.removeListener?.('player_state_changed');
      try{Promise.resolve(instance.pause()).catch(()=>{})}catch{/* Already closed. */}
      try{instance.disconnect()}catch{/* Already closed. */}
    }
  },[]);
  useEffect(()=>()=>dispose(),[dispose]);
  const fail=useCallback(message=>{dispose();setBusy(false);setStatus('error');setMode('embed');setState(null);setError(message)},[dispose]);
  function updateState(value){
    setState(value);
    const track=value?.track_window?.current_track;
    if(track&&/^[a-zA-Z0-9]{22}$/.test(track.id))setSelected({id:track.id,name:track.name,artist:track.artists?.map(a=>a.name).join(', ')||'',album:track.album?.name||'',image:track.album?.images?.[0]?.url||'',duration:value.duration||track.duration_ms||0,uri:`spotify:track:${track.id}`,url:`https://open.spotify.com/track/${track.id}`});
  }
  useEffect(()=>{
    if(status!=='ready'||mode!=='browser')return;
    let cancelled=false,pending=false;
    const timer=setInterval(async()=>{
      if(pending||!player.current)return;pending=true;
      const instance=player.current;
      try{const value=await instance.getCurrentState();if(!cancelled&&instance===player.current)updateState(value)}catch{/* SDK events report connection errors. */}finally{pending=false}
    },1000);
    return()=>{cancelled=true;clearInterval(timer)};
  },[status,mode]);

  async function connectBrowser(){
    if(player.current||status==='loading'||status==='connecting')return;
    const session=readSession();
    if(!SDK_SCOPES.every(scope=>session?.scopes?.includes(scope))){setError('Allow browser playback permissions first, then connect the browser player.');return}
    if(!window.isSecureContext||typeof navigator.requestMediaKeySystemAccess!=='function'){
      setError('This browser does not expose protected-media playback here. Open TSPOT in a current supported browser over HTTPS or 127.0.0.1. The embedded player is still available.');return;
    }
    setError('');setStatus('loading');
    const attempt=++generation.current;
    try{
      const sdk=await loadSpotifySDK();if(attempt!==generation.current)return;
      const instance=new sdk.Player({name:'TSPOT · This browser',volume:volumeRef.current,
        getOAuthToken:callback=>{getSpotifyAccessToken().then(token=>{if(attempt===generation.current)callback(token)}).catch(()=>{if(attempt===generation.current)fail('Spotify login expired or was revoked. Reconnect Spotify and allow browser playback permissions.')})}});
      player.current=instance;
      const listen=(name,callback)=>instance.addListener(name,value=>{if(attempt===generation.current)callback(value)});
      listen('ready',({device_id})=>{clearTimeout(readyTimer.current);device.current=device_id;setStatus('ready');setMode('browser');setError('');setState(null)});
      listen('not_ready',()=>fail('The Spotify browser device disconnected. Reconnect it or use the embedded player.'));
      listen('player_state_changed',value=>updateState(value));
      listen('initialization_error',()=>fail('Spotify could not initialize protected playback in this browser. Check protected-content support or use the embedded player.'));
      listen('authentication_error',()=>fail('Spotify rejected the browser player’s login. Reconnect Spotify and allow browser playback permissions.'));
      listen('account_error',()=>fail('Spotify restricted browser playback for this account or app. Premium, app access, and streaming permissions are required. The embedded player remains available.'));
      listen('playback_error',()=>fail('Spotify could not play this track in the browser. Track, region, account or app restrictions may apply. Use the embedded player instead.'));
      listen('autoplay_failed',()=>setError('Your browser blocked automatic playback. Click Play again to activate audio in this tab.'));
      setStatus('connecting');
      readyTimer.current=setTimeout(()=>{if(attempt===generation.current)fail('Spotify did not make this browser device ready. Check app access and browser support, then reconnect or use the embedded player.')},15000);
      const connected=await instance.connect();
      if(attempt!==generation.current)return;
      if(!connected)fail('Spotify could not connect this browser player. Check app access and use the embedded player if playback is restricted.');
    }catch(err){if(attempt===generation.current)fail(err.message||'Spotify browser playback is unavailable. Use the embedded player.');}
  }
  async function run(operation){
    const instance=player.current,attempt=generation.current;
    if(!instance||!device.current){setError('Connect the browser player before using these controls.');return}
    setBusy(true);setError('');
    try{await operation(instance,()=>attempt===generation.current&&instance===player.current)}
    catch(err){if(attempt===generation.current)fail(`Browser playback could not complete. ${err.message||'Spotify may restrict this operation.'} The embedded player remains available.`)}
    finally{if(attempt===generation.current)setBusy(false)}
  }
  async function playBrowser(track=selectedRef.current,list=queueRef.current){
    if(!track)return;
    onStartRef.current();setActive(true);
    // This call occurs immediately within the user's click, before any Web API await.
    const activation=player.current?.activateElement?.();
    const playbackList=list.some(t=>t.id===track.id)?list:[track];
    await run(async(instance,valid)=>{
      if(activation)await activation;if(!valid())return;
      const id=device.current;
      await transferToBrowser(id);if(!valid())return;
      await startBrowserQueue(playbackList,playbackList.findIndex(t=>t.id===track.id),id);if(!valid())return;
      const value=await instance.getCurrentState();if(valid())updateState(value);
    });
  }
  function selectTrack(track,list=[track]){
    setSelected(track);setQueue(list);setActive(true);onStartRef.current();setError('');
    if(mode==='browser'&&status==='ready')void playBrowser(track,list);
  }
  function embed(){dispose();setMode('embed');setStatus('idle');setState(null);setBusy(false);setError('');if(selectedRef.current){setActive(true);onStartRef.current()}}
  function leave(){setActive(false);dispose();setMode('embed');setStatus('idle');setState(null);setBusy(false);setError('')}
  function reset(){leave();setSelected(null);setQueue([])}
  function requestEmbed(){setError('Use the Play button inside Spotify’s embedded player. Spotify determines available playback; TSPOT stays open.');document.getElementById('spotify-embedded-player')?.scrollIntoView({block:'center',behavior:'smooth'});document.getElementById('spotify-embedded-player')?.focus()}
  async function toggle(){
    if(mode!=='browser'){requestEmbed();return}
    if(!state?.track_window?.current_track){await playBrowser();return}
    if(state.disallows?.[state.paused?'resuming':'pausing']){setError('Spotify currently restricts this playback control for this track or account.');return}
    const activation=player.current?.activateElement?.();
    await run(async(instance,valid)=>{if(activation)await activation;if(!valid())return;onStartRef.current();await (state.paused?instance.resume():instance.pause());if(valid()){const value=await instance.getCurrentState();if(valid())updateState(value)}});
  }
  const next=()=>run(instance=>instance.nextTrack());
  const previous=()=>run(instance=>instance.previousTrack());
  const seek=position=>run(instance=>instance.seek(Math.max(0,Math.min(position,state?.duration||0))));
  const changeVolume=value=>{
    const bounded=Math.max(0,Math.min(1,value));
    void run(async(instance,valid)=>{await instance.setVolume(bounded);if(valid())setVolume(bounded)});
  };
  return {active,selected,queue,mode,status,error,state,volume,busy,deviceId:device.current,connectBrowser,selectTrack,playBrowser,toggle,next,previous,seek,changeVolume,embed,leave,reset};
}
