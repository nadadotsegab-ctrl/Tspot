import {test,expect} from '@playwright/test';
const CLIENT='1234567890abcdef1234567890abcdef';
const TRACK='0123456789abcdefghijkl';
const scopes='user-read-playback-state user-modify-playback-state';
const tokenBody={access_token:'mock-access-token',refresh_token:'mock-refresh-token',expires_in:3600,scope:scopes,token_type:'Bearer'};
const sample={id:TRACK,name:'Connected Song',artists:[{name:'Example Artist'}],album:{name:'Example Album',images:[]},duration_ms:183000,uri:`spotify:track:${TRACK}`,external_urls:{spotify:`https://open.spotify.com/track/${TRACK}`}};
async function seed(page,{expired=false,playback=true}={}){
 await page.addInitScript(({client,expired,playback,scopes})=>{
  if(location.origin!=='http://127.0.0.1:3000')return;
  if(!sessionStorage.getItem('test-seeded')){
   sessionStorage.setItem('tspot-spotify-session',JSON.stringify({accessToken:'mock-access-token',refreshToken:'mock-refresh-token',clientId:client,expiresAt:Date.now()+(expired?-1000:3600000),scopes:playback?scopes.split(' '):[]}));
   sessionStorage.setItem('test-seeded','yes');
  }
  localStorage.setItem('tspot-spotify-config',JSON.stringify({clientId:client}));
 },{client:CLIENT,expired,playback,scopes});
}
async function openSpotify(page){await page.goto('/');await page.locator('.spotify-header-button').click()}
test('PKCE authorization has state, S256 and no client secret; callback exchanges code',async({page})=>{
 let authorize,exchange;
 await page.route('https://accounts.spotify.com/authorize?**',async route=>{
  authorize=new URL(route.request().url());
  await route.fulfill({status:200,contentType:'text/html',body:'Spotify login test double'});
 });
 await page.route('https://accounts.spotify.com/api/token',async route=>{exchange=new URLSearchParams(route.request().postData());await route.fulfill({json:tokenBody})});
 await openSpotify(page);await page.getByLabel('Spotify Client ID',{exact:false}).fill(CLIENT);
 await page.getByRole('button',{name:'Connect Spotify',exact:true}).click();
 await expect.poll(()=>authorize?.searchParams.get('code_challenge_method')).toBe('S256');
 expect(authorize.searchParams.get('client_id')).toBe(CLIENT);
 expect(authorize.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:3000/callback');
 expect(authorize.searchParams.get('code_challenge')).toHaveLength(43);
 expect(authorize.searchParams.get('state').length).toBeGreaterThan(40);
 expect(authorize.searchParams.get('scope')).toBe(scopes);
 expect(authorize.searchParams.has('client_secret')).toBe(false);
 await page.goto(`/callback?code=mock-code&state=${authorize.searchParams.get('state')}`);
 await expect(page.getByText('Connected to Spotify',{exact:true})).toBeVisible();
 expect(exchange.get('grant_type')).toBe('authorization_code');expect(exchange.get('code')).toBe('mock-code');
 expect(exchange.get('code_verifier').length).toBeGreaterThan(40);expect(exchange.has('client_secret')).toBe(false);
 const expectedChallenge=await page.evaluate(async verifier=>{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
 },exchange.get('code_verifier'));
 expect(expectedChallenge).toBe(authorize.searchParams.get('code_challenge'));
 expect(page.url()).not.toContain('mock-code');
 const storage=await page.evaluate(()=>({local:JSON.stringify(localStorage),session:sessionStorage.getItem('tspot-spotify-session')}));
 expect(storage.local).not.toContain('mock-access-token');expect(storage.session).toContain('mock-access-token');
});
test('rejects forged callback state without exchanging code',async({page})=>{
 let tokenRequests=0;await page.route('https://accounts.spotify.com/api/token',async route=>{tokenRequests++;await route.abort()});
 await page.addInitScript(()=>sessionStorage.setItem('tspot-spotify-pkce',JSON.stringify({state:'real-state',verifier:'real-verifier',createdAt:Date.now(),clientId:'1234567890abcdef1234567890abcdef',redirectUri:'http://127.0.0.1:3000/callback'})));
 await page.goto('/callback?code=attacker-code&state=wrong-state');
 await expect(page.getByRole('alert')).toContainText('could not be verified');expect(tokenRequests).toBe(0);
 expect(page.url()).not.toContain('attacker-code');
});
test('search maps Spotify metadata and selects official embed without downloading audio',async({page})=>{
 await seed(page);let requested;
 await page.route('https://api.spotify.com/v1/search?**',async route=>{requested=route.request();await route.fulfill({json:{tracks:{items:[sample]}}})});
 await page.route('https://open.spotify.com/embed/**',route=>route.fulfill({contentType:'text/html',body:'Official player test double'}));
 await openSpotify(page);await page.getByRole('textbox',{name:'Search music'}).fill('Example Artist');
 await expect(page.getByText('Connected Song',{exact:true})).toBeVisible();
 expect(new URL(requested.url()).searchParams.get('q')).toBe('Example Artist');
 expect(requested.headers().authorization).toBe('Bearer mock-access-token');
 await page.getByRole('button',{name:'Play Connected Song',exact:true}).click();
 await expect(page.locator('iframe')).toHaveAttribute('src',`https://open.spotify.com/embed/track/${TRACK}?utm_source=generator`);
 await expect.poll(()=>page.locator('audio').evaluate(a=>a.paused)).toBe(true);
 await expect(page.getByRole('link',{name:'Open in Spotify',exact:true})).toHaveAttribute('href',`https://open.spotify.com/track/${TRACK}`);
});
test('refreshes expired token once before search',async({page})=>{
 await seed(page,{expired:true});let refreshCount=0,params;
 await page.route('https://accounts.spotify.com/api/token',async route=>{refreshCount++;params=new URLSearchParams(route.request().postData());await route.fulfill({json:{...tokenBody,access_token:'refreshed-mock-token'}})});
 await page.route('https://api.spotify.com/v1/search?**',async route=>{expect(route.request().headers().authorization).toBe('Bearer refreshed-mock-token');await route.fulfill({json:{tracks:{items:[sample]}}})});
 await openSpotify(page);await page.getByRole('textbox',{name:'Search music'}).fill('Example');await expect(page.getByText('Connected Song',{exact:true})).toBeVisible();
 expect(refreshCount).toBe(1);expect(params.get('grant_type')).toBe('refresh_token');expect(params.has('client_secret')).toBe(false);
});
test('Premium Connect selects unrestricted device and sends only declared playback commands',async({page})=>{
 await seed(page);const commands=[];
 await page.route('https://api.spotify.com/v1/search?**',route=>route.fulfill({json:{tracks:{items:[sample]}}}));
 await page.route('https://open.spotify.com/embed/**',route=>route.fulfill({contentType:'text/html',body:'Player test double'}));
 await page.route('https://api.spotify.com/v1/me/player/devices',route=>route.fulfill({json:{devices:[{id:'restricted',name:'Restricted device',is_restricted:true},{id:'mac',name:'My Mac',is_active:true,is_restricted:false}]}}));
 await page.route('https://api.spotify.com/v1/me/player/play?**',async route=>{commands.push({type:'play',method:route.request().method(),url:route.request().url(),body:route.request().postDataJSON()});await route.fulfill({status:204})});
 await page.route('https://api.spotify.com/v1/me/player/pause?**',async route=>{commands.push({type:'pause',method:route.request().method()});await route.fulfill({status:204})});
 await openSpotify(page);await page.getByRole('textbox',{name:'Search music'}).fill('Example');await page.getByRole('button',{name:'Play Connected Song',exact:true}).click();
 expect(commands).toHaveLength(0);
 await page.getByRole('button',{name:'Refresh devices'}).click();await expect(page.getByLabel('Spotify playback device')).toHaveValue('mac');
 await expect(page.getByLabel('Spotify playback device').locator('option')).toHaveCount(1);
 await page.getByRole('button',{name:'Play on device',exact:true}).click();await expect(page.getByRole('status')).toContainText('Play command sent');
 expect(commands[0]).toMatchObject({type:'play',method:'PUT',body:{uris:[`spotify:track:${TRACK}`]}});expect(commands[0].url).toContain('device_id=mac');
 await page.getByRole('button',{name:'Pause on Spotify'}).click();await expect(page.getByRole('status')).toContainText('Pause command sent');expect(commands[1]).toEqual({type:'pause',method:'PUT'});
});
test('handles access denial, rate limiting and revoked sessions with useful messages',async({page})=>{
 await seed(page);let status=403;
 await page.route('https://api.spotify.com/v1/search?**',route=>route.fulfill({status,headers:{'Retry-After':'5','Access-Control-Expose-Headers':'Retry-After'},json:{error:{status}}}));
 await openSpotify(page);await page.getByRole('textbox',{name:'Search music'}).fill('Example');
 await expect(page.getByRole('alert')).toContainText('Spotify denied');status=429;
 await page.getByRole('button',{name:'Try again'}).click();await expect(page.getByRole('alert')).toContainText('5 seconds');status=401;
 await page.getByRole('button',{name:'Try again'}).click();await expect(page.getByRole('alert')).toContainText('revoked');
 await expect(page.getByRole('button',{name:'Connect Spotify',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>sessionStorage.getItem('tspot-spotify-session'))).toBeNull();
});
test('disconnect removes tokens and prevents later Spotify searches',async({page})=>{
 await seed(page);let searches=0;
 await page.route('https://api.spotify.com/v1/search?**',route=>{searches++;return route.fulfill({json:{tracks:{items:[sample]}}})});
 await openSpotify(page);await page.getByRole('textbox',{name:'Search music'}).fill('Example');await expect(page.getByText('Connected Song',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Disconnect',exact:true}).click();
 expect(await page.evaluate(()=>sessionStorage.getItem('tspot-spotify-session'))).toBeNull();
 await page.getByRole('textbox',{name:'Search music'}).fill('Another');await page.waitForTimeout(600);expect(searches).toBe(1);
});
test('mobile Spotify setup stays within the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await openSpotify(page);
 await expect(page.getByRole('heading',{name:'Find it on Spotify.'})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
