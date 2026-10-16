// Test-only stand-in: exercises integration contracts, never decrypts or plays media.
window.__sdk={calls:[],state:null,volume:.65,index:0,tracks:[],order:[]};
window.Spotify={Player:class {
 constructor(options){this.options=options;this.listeners={};window.__sdk.player=this;window.__sdk.calls.push(['construct',options.name])}
 addListener(name,callback){this.listeners[name]=callback;return true}
 removeListener(name){delete this.listeners[name];return true}
 emit(name,value){this.listeners[name]?.(value)}
 async connect(){window.__sdk.calls.push(['connect']);this.options.getOAuthToken(token=>{window.__sdk.tokenReceived=Boolean(token)});setTimeout(()=>{const err=window.__sdkOptions?.error;if(err)this.emit(err,{message:'simulated'});else this.emit('ready',{device_id:'tspot-browser-device'})},0);return true}
 disconnect(){window.__sdk.calls.push(['disconnect'])}
 activateElement(){window.__sdk.calls.push(['activateElement',navigator.userActivation.isActive]);window.__sdk.order.push('activateElement');return Promise.resolve()}
 getCurrentState(){return Promise.resolve(window.__sdk.state)}
 async resume(){window.__sdk.calls.push(['resume']);if(window.__sdk.state){window.__sdk.state={...window.__sdk.state,paused:false};this.emit('player_state_changed',window.__sdk.state)}}
 async pause(){window.__sdk.calls.push(['pause']);if(window.__sdk.state){window.__sdk.state={...window.__sdk.state,paused:true};this.emit('player_state_changed',window.__sdk.state)}}
 async nextTrack(){window.__sdk.calls.push(['nextTrack']);window.__sdk.setTrack(Math.min(window.__sdk.index+1,window.__sdk.tracks.length-1))}
 async previousTrack(){window.__sdk.calls.push(['previousTrack']);window.__sdk.setTrack(Math.max(window.__sdk.index-1,0))}
 async seek(ms){window.__sdk.calls.push(['seek',ms]);window.__sdk.state={...window.__sdk.state,position:ms};this.emit('player_state_changed',window.__sdk.state)}
 async setVolume(value){window.__sdk.calls.push(['setVolume',value]);window.__sdk.volume=value}
}};
window.__sdk.setTrack=index=>{window.__sdk.index=index;const t=window.__sdk.tracks[index];window.__sdk.state={paused:false,position:0,duration:183000,disallows:{},track_window:{current_track:{...t,artists:[{name:'Example Artist'}],album:{name:'Example Album',images:[]}}}};window.__sdk.player.emit('player_state_changed',window.__sdk.state)};
window.onSpotifyWebPlaybackSDKReady();
