import React, {useState} from 'react';
import {Headphones, ListMusic, Maximize2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X} from 'lucide-react';
import {fmt} from './data';

export default function SpotifyTransport({playback:p,onOpenPlayer}) {
  const [queueOpen,setQueueOpen]=useState(false);
  const track=p.selected;
  const browser=p.mode==='browser'&&p.status==='ready';
  const paused=!p.state||p.state.paused;
  const disallowed=p.state?.disallows||{};
  const position=(p.state?.position||0)/1000;
  const duration=(p.state?.duration||track.duration||0)/1000;
  function embedControls(){onOpenPlayer();requestAnimationFrame(()=>p.toggle())}
  return <>
    {queueOpen&&<aside className="queue-panel spotify-queue-panel"><div className="queue-heading"><h2>Spotify rotation</h2><button className="icon-btn" aria-label="Close Spotify queue" onClick={()=>setQueueOpen(false)}><X size={20}/></button></div><p className="spotify-fine-print">Your selected search results. Browser playback queues these tracks in Spotify.</p>{p.queue.map(t=><button className={`queue-track ${t.id===track.id?'active':''}`} key={t.id} onClick={()=>p.selectTrack(t,p.queue)}>{t.image?<img className="cover" src={t.image} alt=""/>:<Headphones size={24}/>}<span><strong>{t.name}</strong><small>{t.artist}</small></span><Play size={15}/></button>)}</aside>}
    <footer className={`player spotify-transport ${browser?'browser-transport':'embed-transport'}`} aria-label="Spotify playback controls">
      <div className="now-playing"><button className="spotify-now-art" aria-label="Show Spotify player" onClick={onOpenPlayer}>{track.image?<img className="cover" src={track.image} alt=""/>:<Headphones size={28}/>}</button><div><strong>{track.name}</strong><small>{track.artist}</small><span className="spotify-transport-label">{browser?'SPOTIFY · THIS BROWSER':'SPOTIFY · EMBEDDED PLAYER'}</span></div></div>
      <div className="playback"><div className="playback-buttons"><button className="icon-btn" aria-label="Previous track" disabled={!browser||p.busy||disallowed.skipping_prev} onClick={p.previous}><SkipBack size={19} fill="currentColor"/></button><button className="player-play" aria-label={browser&&!paused?'Pause':'Play'} disabled={p.busy||(browser&&(paused?disallowed.resuming:disallowed.pausing))} onClick={browser?p.toggle:embedControls}>{browser&&!paused?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button><button className="icon-btn" aria-label="Next track" disabled={!browser||p.busy||disallowed.skipping_next} onClick={p.next}><SkipForward size={19} fill="currentColor"/></button></div>
      {browser?<div className="progress"><span>{fmt(position)}</span><input type="range" aria-label="Seek" min="0" max={duration||1} step=".1" value={Math.min(position,duration)} disabled={p.busy||!p.state||disallowed.seeking} onChange={e=>p.seek(Number(e.target.value)*1000)} style={{'--progress':`${duration?position/duration*100:0}%`}}/><span>{fmt(duration)}</span></div>:<button className="spotify-embed-hint" onClick={embedControls}>Use the controls in Spotify’s embedded player</button>}</div>
      <div className="player-extras"><button className={`icon-btn ${queueOpen?'active':''}`} aria-label="Open queue" onClick={()=>setQueueOpen(!queueOpen)}><ListMusic size={19}/></button><span className="player-divider"/><button className="icon-btn" aria-label={p.volume?'Mute':'Unmute'} disabled={!browser||p.busy} onClick={()=>p.changeVolume(p.volume?0:.65)}>{p.volume?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><input type="range" aria-label="Volume" min="0" max="1" step=".01" value={p.volume} disabled={!browser||p.busy} onChange={e=>p.changeVolume(Number(e.target.value))} style={{'--progress':`${p.volume*100}%`}}/><button className="icon-btn" aria-label="Show Spotify player" onClick={onOpenPlayer}><Maximize2 size={17}/></button></div>
    </footer>
  </>;
}
