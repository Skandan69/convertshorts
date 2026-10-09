const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const BASE=process.env.BASE_URL || 'http://localhost:4173';
const output=path.join(__dirname,'results/creative-apps');
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(BASE+'/apps/editors/');
  await page.waitForSelector('.app-card');
  assert.equal(await page.locator('.app-card').count(),7);
  await page.locator('[data-filter="image"]').click();
  assert.equal(await page.locator('.app-card').count(),2);
  await page.locator('[data-filter="all"]').click();
  await page.locator('#app-search').fill('keyframe');
  assert.equal(await page.locator('.app-card').count(),2);
  await page.locator('#app-search').fill('');
  await page.locator('[data-favorite="photo"]').click();
  await page.locator('[data-filter="favorites"]').click();
  assert.equal(await page.locator('.app-card').count(),1);
  await page.reload();
  await page.locator('[data-filter="favorites"]').click();
  assert.equal(await page.locator('.app-card').count(),1);
  await page.locator('[data-filter="all"]').click();
  await page.screenshot({path:path.join(output,'hub-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile hub overflow');
  await page.screenshot({path:path.join(output,'hub-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  const results=[];
  for(const [id,engine] of [['photo','photocraft'],['vector','vectorcraft'],['light','lightcraft'],['pdf','pdfcraft'],['motion','effectcraft'],['layout','designcraft'],['video','filmcraft']]){
    const tab=await context.newPage();
    const runtimeErrors=[];
    tab.on('pageerror',e=>runtimeErrors.push(String(e)));
    await tab.goto(`${BASE}/apps/${id}/`);
    await tab.locator('#open-editor').click();
    await tab.waitForSelector('iframe.editor-frame');
    const frame=tab.frames().find(f=>f.url().includes('/engines/')) || await new Promise(resolve=>tab.once('framenavigated',resolve));
    await frame.waitForSelector('canvas',{timeout:90000});
    await frame.waitForFunction(engine=>{
      if(engine==='filmcraft')return Number.isFinite(window.filmcraftLoad?.readyMs)&&!window.filmcraftLoad?.error&&!window.filmcraftLoad?.fatal;
      if(engine==='effectcraft')return Number.isFinite(window.effectcraftLoad?.readyMs)&&!window.effectcraftLoad?.error;
      if(engine==='lightcraft')return !!window.lightcraft&&(!document.getElementById('lightcraft_loading')||getComputedStyle(document.getElementById('lightcraft_loading')).display==='none');
      if(!window.wasmBindings)return false;
      const loading=document.getElementById(engine+'_loading');
      const canvas=document.querySelector('canvas');
      return (!loading||getComputedStyle(loading).display==='none')&&canvas.width>0&&canvas.height>0;
    },engine,{timeout:90000});
    if(engine==='filmcraft'){const result=await frame.evaluate(()=>filmcraft.inspect());assert.ok(result && typeof result==='object');}
    if(engine==='lightcraft'){
      const result=await frame.evaluate(async()=>JSON.parse(await lightcraft.command('library.info','{}')));
      assert.ok(result && typeof result==='object');
    }
    if(engine==='effectcraft'){
      const result=await frame.evaluate(async()=>effectcraft.inspect());
      assert.ok(result && typeof result==='object');
    }
    assert.equal(runtimeErrors.length,0,`${engine}: ${runtimeErrors.join('; ')}`);
    await tab.screenshot({path:path.join(output,id+'-editor.png')});
    results.push({id,engine,initialized:true,errors:runtimeErrors});
    await tab.close({runBeforeUnload:false});
  }
  assert.equal(errors.length,0,errors.join('; '));
  await fs.writeFile(path.join(output,'startup-results.json'),JSON.stringify({results,hubChecks:'passed',videoEditorMounted:true},null,2));
  await browser.close();
  console.log('PASS hub search/filter/favorites/mobile, seven engine startups including FilmCraft');
})().catch(async e=>{console.error(e);process.exit(1);});
