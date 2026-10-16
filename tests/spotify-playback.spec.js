import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const sdk=fs.readFileSync(new URL('./fixtures/spotify-sdk-double.js',import.meta.url),'utf8');
const IDs=['0123456789abcdefghijkl','abcdefghijkl0123456789'];
const songs=IDs.map((id,i)=>({id,name:`Browser Song ${i+1}`,artists:[{name:'Example Artist'}],album:{name:'Example Album',images:[]},duration_ms:183000,uri:`spotify:track:${id}`}));
const basicScopes='user-read-playback-state user-modify-playback-state';
async function setup(page,{streaming=true,sdkError=null,scriptBlocked=false,transferStatus=204}={}){
 const commands=[];
 await page.addInitScript(({scopes,sdkError})=>{
  if(location.origin!=='http://127.0.0.1:3000')return;
  window.__sdkOptions={error:sdkError};
  sessionStorage.setItem('tspot-spotify-session',JSON.stringify({accessToken:'mock-playback-token',refreshToken:'mock-refresh-token',clientId:'1234567890abcdef1234567890abcdef',expiresAt:Date.now()+3600000,scopes:scopes.split(' ')}));
  localStorage.setItem('tspot-spotify-config',JSON.stringify({clientId:'1234567890abcdef1234567890abcdef'}));
 },{scopes:basicScopes+(streaming?' streaming user-read-email user-read-private':''),sdkError});
 await page.route('https://api.spotify.com/v1/search?**',route=>route.fulfill({json:{tracks:{items:songs}}}));
 await page.route('https://open.spotify.com/embed/**',route=>route.fulfill({contentType:'text/html',body:'<p>Spotify embedded player test double</p>'}));
 await page.route('https://sdk.scdn.co/spotify-player.js',route=>scriptBlocked?route.abort():route.fulfill({contentType:'application/javascript',body:sdk}));
 await page.route('https://api.spotify.com/v1/me/player',async route=>{
  commands.push({kind:'transfer',method:route.request().method(),body:route.request().postDataJSON()});
  await page.evaluate(()=>window.__sdk.order.push('transfer'));
  await route.fulfill(transferStatus===204?{status:204}:{status:transferStatus,json:{error:{status:transferStatus}}});
 });
 await page.route('https://api.spotify.com/v1/me/player/play?**',async route=>{
  const body=route.request().postDataJSON();commands.push({kind:'play',method:route.request().method(),url:route.request().url(),body});
  await page.evaluate(({songs,index})=>{window.__sdk.order.push('play');window.__sdk.tracks=songs;window.__sdk.setTrack(index)},{songs,index:body.offset.position});
  await route.fulfill({status:204});
 });
 await page.goto('/');await page.locator('.spotify-header-button').click();await page.getByRole('textbox',{name:'Search music'}).fill('Browser');
 await expect(page.getByRole('button',{name:'Play Browser Song 1',exact:true})).toBeVisible();
 return commands;
}
async function select(page){await page.getByRole('button',{name:'Play Browser Song 1',exact:true}).click()}
async function enable(page){await select(page);await page.getByRole('button',{name:'Enable browser player',exact:true}).click();await expect(page.getByRole('button',{name:'Browser player ready',exact:true})).toBeVisible()}

test('Play, title and artwork load the iframe without navigation or a new tab',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const commands=await setup(page,{streaming:false});
 const start=page.url(),navigations=[];page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url())});
 let sdkLoads=0;page.on('request',req=>{if(req.url().includes('sdk.scdn.co'))sdkLoads++});
 await select(page);await expect(page.locator('#spotify-embedded-player')).toHaveAttribute('src',`https://open.spotify.com/embed/track/${IDs[0]}?utm_source=generator`);
 await page.getByRole('button',{name:'Select Browser Song 2',exact:true}).click();await expect(page.locator('#spotify-embedded-player')).toHaveAttribute('src',`https://open.spotify.com/embed/track/${IDs[1]}?utm_source=generator`);
 await page.getByRole('button',{name:'Select Browser Song 1 artwork',exact:true}).click();await expect(page.locator('#spotify-embedded-player')).toHaveAttribute('src',`https://open.spotify.com/embed/track/${IDs[0]}?utm_source=generator`);
 await page.locator('.spotify-transport').getByRole('button',{name:'Play',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('inside Spotify’s embedded player');
 expect(page.url()).toBe(start);expect(navigations).toEqual([]);expect(context.pages()).toHaveLength(1);expect(commands).toEqual([]);expect(sdkLoads).toBe(0);expect(errors).toEqual([]);
 await expect(page.getByRole('link',{name:'Open Browser Song 1 in Spotify (external)',exact:true})).toHaveAttribute('href',`https://open.spotify.com/track/${IDs[0]}`);
});
test('SDK readiness alone does not transfer or start playback; footer Play targets this browser',async({page,context})=>{
 const commands=await setup(page);await enable(page);expect(commands).toEqual([]);expect(await page.evaluate(()=>window.__sdk.tokenReceived)).toBe(true);
 const start=page.url();await page.locator('.spotify-transport').getByRole('button',{name:'Play',exact:true}).click();
 await expect(page.locator('.spotify-transport').getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 expect(commands[0]).toEqual({kind:'transfer',method:'PUT',body:{device_ids:['tspot-browser-device'],play:false}});
 expect(commands[1]).toMatchObject({kind:'play',method:'PUT',body:{uris:IDs.map(id=>`spotify:track:${id}`),offset:{position:0},position_ms:0}});
 expect(commands[1].url).toContain('device_id=tspot-browser-device');
 const order=await page.evaluate(()=>window.__sdk.order);expect(order.slice(-3)).toEqual(['activateElement','transfer','play']);
 expect(await page.evaluate(()=>window.__sdk.calls.find(c=>c[0]==='activateElement')[1])).toBe(true);
 expect(page.url()).toBe(start);expect(context.pages()).toHaveLength(1);
});
test('play pause next previous seek and volume use SDK controls and reflect its state',async({page})=>{
 await setup(page);await enable(page);const player=page.locator('.spotify-transport');
 await player.getByRole('button',{name:'Play',exact:true}).click();await expect(player.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await player.getByRole('button',{name:'Pause',exact:true}).click();await expect(player.getByRole('button',{name:'Play',exact:true})).toBeVisible();
 await player.getByRole('button',{name:'Play',exact:true}).click();await expect(player.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await player.getByRole('button',{name:'Next track'}).click();await expect(player.locator('.now-playing strong')).toHaveText('Browser Song 2');
 await player.getByRole('button',{name:'Previous track'}).click();await expect(player.locator('.now-playing strong')).toHaveText('Browser Song 1');
 await player.getByRole('slider',{name:'Seek',exact:true}).fill('25');await expect(player.getByRole('slider',{name:'Seek',exact:true})).toHaveValue('25');
 await player.getByRole('slider',{name:'Volume',exact:true}).fill('0.3');await expect(player.getByRole('slider',{name:'Volume',exact:true})).toHaveValue('0.3');
 const calls=await page.evaluate(()=>window.__sdk.calls);for(const name of ['pause','resume','nextTrack','previousTrack'])expect(calls.some(c=>c[0]===name)).toBe(true);
 expect(calls).toContainEqual(['seek',25000]);expect(calls).toContainEqual(['setVolume',.3]);
 // Navigating to the existing library does not destroy the browser playback session.
 await page.getByRole('button',{name:'Your library',exact:true}).click();await expect(page.getByRole('heading',{name:'Your library.'})).toBeVisible();await expect(player.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
});
test('browser playback consent requests streaming scopes explicitly, never from Play',async({page})=>{
 await setup(page,{streaming:false});let auth;
 await page.route('https://accounts.spotify.com/authorize?**',async route=>{auth=new URL(route.request().url());await route.fulfill({contentType:'text/html',body:'Mock consent'})});
 await select(page);expect(auth).toBeUndefined();await page.getByRole('button',{name:'Allow browser playback',exact:true}).click();
 await expect.poll(()=>auth?.searchParams.get('scope')).toContain('streaming');
 expect(auth.searchParams.get('scope')).toContain('user-read-private');expect(auth.searchParams.get('scope')).toContain('user-read-email');expect(auth.searchParams.has('client_secret')).toBe(false);
});
for(const [sdkError,message] of [['account_error','Premium, app access'],['authentication_error','Reconnect Spotify'],['initialization_error','protected playback'],['playback_error','restrictions may apply']]){
 test(`SDK ${sdkError} clearly falls back to embed without leaving TSPOT`,async({page,context})=>{
  const commands=await setup(page,{sdkError});const start=page.url();await select(page);await page.getByRole('button',{name:'Enable browser player',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText(message);await expect(page.locator('#spotify-embedded-player')).toBeVisible();expect(page.url()).toBe(start);expect(context.pages()).toHaveLength(1);expect(commands).toEqual([]);
 });
}
test('blocked SDK script retains embed and actionable message',async({page})=>{
 await setup(page,{scriptBlocked:true});await select(page);await page.getByRole('button',{name:'Enable browser player',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('blocked or could not load');await expect(page.locator('#spotify-embedded-player')).toBeVisible();
});
test('Spotify app access denial during transfer stops SDK and retains embed',async({page})=>{
 const commands=await setup(page,{transferStatus:403});await enable(page);await page.locator('.spotify-transport').getByRole('button',{name:'Play',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Spotify denied');await expect(page.locator('#spotify-embedded-player')).toBeVisible();expect(commands).toHaveLength(1);
 expect(await page.evaluate(()=>window.__sdk.calls.some(c=>c[0]==='disconnect'))).toBe(true);
});
test('autoplay failure invites another Play click without redirect',async({page})=>{
 await setup(page);await enable(page);await page.evaluate(()=>window.__sdk.player.emit('autoplay_failed',{}));await expect(page.getByRole('alert')).toContainText('Click Play again');
 await page.locator('.spotify-transport').getByRole('button',{name:'Play',exact:true}).click();await expect(page.locator('.spotify-transport').getByRole('button',{name:'Pause',exact:true})).toBeVisible();
});
test('SDK restrictions disable unavailable transport controls',async({page})=>{
 await setup(page);await enable(page);await page.locator('.spotify-transport').getByRole('button',{name:'Play',exact:true}).click();
 await expect(page.locator('.spotify-transport').getByRole('button',{name:'Next track'})).toBeEnabled();
 await expect(page.locator('.spotify-transport').getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await page.evaluate(()=>{window.__sdk.state={...window.__sdk.state,disallows:{skipping_next:true,skipping_prev:true,seeking:true,pausing:true}};window.__sdk.player.emit('player_state_changed',window.__sdk.state)});
 const player=page.locator('.spotify-transport');for(const name of ['Next track','Previous track','Pause'])await expect(player.getByRole('button',{name,exact:true})).toBeDisabled();await expect(player.getByRole('slider',{name:'Seek',exact:true})).toBeDisabled();
});
test('switching to demo audio disconnects SDK and preserves demo playlists',async({page})=>{
 await setup(page);await enable(page);await page.locator('.spotify-transport').getByRole('button',{name:'Play',exact:true}).click();await expect(page.locator('.spotify-transport').getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Play the mix',exact:true}).click();
 await expect(page.locator('.spotify-transport')).toHaveCount(0);await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThan(.1);
 expect(await page.evaluate(()=>window.__sdk.calls.some(c=>c[0]==='disconnect'))).toBe(true);
 await page.getByRole('button',{name:'Liked songs 2 songs · made by you'}).click();await expect(page.locator('.track-row:not(.track-head)')).toHaveCount(2);
});
test('a browser without protected-media support keeps playback embedded',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'requestMediaKeySystemAccess',{value:undefined,configurable:true}));
 await setup(page);await select(page);await page.getByRole('button',{name:'Enable browser player',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('does not expose protected-media');await expect(page.locator('#spotify-embedded-player')).toBeVisible();
 expect(await page.evaluate(()=>Boolean(window.__sdk))).toBe(false);
});
test('disconnect tears down browser playback and removes the embed and footer',async({page})=>{
 await setup(page);await enable(page);await page.locator('.spotify-transport').getByRole('button',{name:'Play',exact:true}).click();await expect(page.locator('.spotify-transport').getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Disconnect',exact:true}).click();await expect(page.locator('.spotify-transport')).toHaveCount(0);await expect(page.locator('#spotify-embedded-player')).toHaveCount(0);
 expect(await page.evaluate(()=>sessionStorage.getItem('tspot-spotify-session'))).toBeNull();expect(await page.evaluate(()=>window.__sdk.calls.some(c=>c[0]==='disconnect'))).toBe(true);
});
