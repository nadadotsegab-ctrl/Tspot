import {test,expect} from '@playwright/test';
test('home, real audio playback, seeking and queue',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.getByRole('heading',{name:'Find your next feeling.'})).toBeVisible();
 await page.getByRole('button',{name:'Play the mix',exact:true}).click();
 await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThan(.2);
 await page.getByRole('slider',{name:'Seek',exact:true}).fill('20');
 await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThanOrEqual(20);
 await page.getByRole('button',{name:'Next track'}).click();
 await expect(page.locator('.now-playing strong')).toHaveText('City Lights');
 await page.getByRole('button',{name:'Open queue'}).click();
 await expect(page.getByRole('heading',{name:'Up next'})).toBeVisible();
 await page.getByRole('button',{name:'Close queue'}).click();
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await expect.poll(()=>page.locator('audio').evaluate(a=>a.paused)).toBe(true);expect(errors).toEqual([]);
});
test('search matches title artist and empty state',async({page})=>{
 await page.goto('/');const search=page.getByRole('textbox',{name:'Search music'});
 await search.fill('Luna Park');await expect(page.locator('.track-row:not(.track-head)')).toHaveCount(2);
 await search.fill('unfindable track');await expect(page.getByRole('heading',{name:'No tracks found'})).toBeVisible();
 await page.getByRole('button',{name:'Browse all tracks'}).click();await expect(page.locator('.track-row:not(.track-head)')).toHaveCount(8);
});
test('create playlist, add track and retain across reload',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Create playlist',exact:true}).click();
 await page.getByLabel('Playlist name').fill('My evening mix');await page.getByRole('dialog').getByRole('button',{name:'Create playlist',exact:true}).click();
 await expect(page.getByRole('heading',{name:'My evening mix'})).toBeVisible();
 await page.getByRole('button',{name:'Find your first song'}).click();
 await page.getByRole('button',{name:'Add Midnight City to playlist',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'My evening mix'}).click();
 await page.locator('.playlist-nav').getByRole('button',{name:'My evening mix Playlist · You'}).click();
 await expect(page.locator('.track-row:not(.track-head)')).toHaveCount(1);
 await page.reload();await page.locator('.playlist-nav').getByRole('button',{name:'My evening mix Playlist · You'}).click();
 await expect(page.locator('.track-title strong')).toHaveText('Midnight City');
});
test('favorites and customization persist',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Like Midnight City',exact:true}).click();
 await page.getByRole('button',{name:'Liked songs 3 songs · made by you'}).click();
 await expect(page.locator('.track-row:not(.track-head)')).toHaveCount(3);
 await page.getByRole('button',{name:'Customize TSPOT'}).click();await page.getByRole('button',{name:'lavender accent'}).click();
 await page.keyboard.press('Escape');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-accent','lavender');
 await page.getByRole('button',{name:'Liked songs 3 songs · made by you'}).click();await expect(page.locator('.track-title strong').filter({hasText:'Midnight City'})).toBeVisible();
});
test('mobile navigation and no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('button',{name:'Your library',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your library.'})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/tspot-mobile.png',fullPage:true});
});
test('desktop visual and all art loads',async({page})=>{
 await page.goto('/');await page.locator('.mix-card').last().waitFor();
 await expect.poll(()=>page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
 await page.screenshot({path:'test-results/tspot-desktop.png',fullPage:true});
});
