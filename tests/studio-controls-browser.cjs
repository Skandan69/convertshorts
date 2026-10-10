const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const BASE=process.env.BASE_URL||'http://localhost:4173';
(async()=>{
 const {MODELS,prepareGeneration}=await import('../server/studio-core.mjs');
 const {schemaShape}=await import('../apps/studio/generation-controls.js');
 const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[],requests=[];
 await context.route('**/api/cloud',r=>r.fulfill({contentType:'application/json',body:'{"enabled":false}'}));
 await context.route('**/api/billing**',r=>r.fulfill({contentType:'application/json',body:'{"enabled":false,"generationEnabled":false}'}));
 await context.route('**/api/studio**',async r=>{
  if(r.request().method()==='POST'){
   const body=r.request().postDataJSON();let prepared;
   try{prepared=prepareGeneration(body);}catch(e){errors.push('Invalid generation: '+e.message);return r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:e.message})});}
   requests.push({body,prepared});return r.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'IN_QUEUE',token:'fixture-'+requests.length,request_id:'fixture-'+requests.length})});
  }
  return r.fulfill({contentType:'application/json',body:JSON.stringify(r.request().url().includes('token=')?{status:'IN_PROGRESS'}:{models:MODELS,sharedProviderConfigured:false})});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(BASE+'/apps/#settings');await page.locator('#provider-key').fill('fixture-key-no-real-provider-access');await page.locator('#connection-form button').click();
 await page.goto(BASE+'/apps/#create-audio');await page.locator('#generation-model').waitFor();
 assert.equal(await page.locator('#generation-model').inputValue(),'fal:fal-ai/ace-step','New audio composers start with a song model');
 assert.equal(await page.locator('[data-param=duration]').isVisible(),true);assert.equal(await page.locator('[data-param=lyrics]').isVisible(),true);
 assert.equal(await page.locator('#generation-ratio').isVisible(),false,'No image aspect ratio on audio');
 await page.locator('#generation-prompt').fill('acoustic pop, warm guitar, 100 BPM');await page.locator('[data-param=lyrics]').fill('[Verse]\nThis is our new song\n[Chorus]\nKeep the light on');
 await page.locator('[data-param=duration]').fill('90');await page.locator('#music-vocals').selectOption('female');await page.locator('#music-excludes').fill('heavy bass');
 const submit=async()=>{const count=requests.length;await page.locator('#generate').click();await page.waitForFunction(()=>document.querySelector('#generate')?.disabled===false);assert.equal(requests.length,count+1);return requests.at(-1);};
 let req=await submit();assert.equal(req.prepared.input.tags,'acoustic pop, warm guitar, 100 BPM, female vocals, without heavy bass');assert.equal(req.prepared.input.duration,90);assert.ok(req.prepared.input.lyrics.includes('Keep the light on'));assert.equal('guidance' in req.body,false);
 await page.locator('#music-vocals').selectOption('instrumental');req=await submit();assert.equal(req.prepared.input.lyrics,'[instrumental]');
 await page.locator('#music-vocals').selectOption('male');
 await page.locator('#generation-model').selectOption('fal:fal-ai/minimax-music/v2');assert.equal(await page.locator('[data-param=lyrics_prompt]').isVisible(),true);assert.ok((await page.locator('[data-param=lyrics_prompt]').inputValue()).includes('Keep the light on'),'Lyrics survive compatible model changes');
 assert.equal(await page.locator('[data-param=duration]').count(),0);assert.ok((await page.locator('#model-capabilities').textContent()).includes('chooses the length'));
 req=await submit();assert.ok(req.prepared.input.prompt.includes('male vocals'));assert.equal('duration' in req.prepared.input,false);
 await page.locator('#generation-model').selectOption('fal:fal-ai/elevenlabs/tts/multilingual-v2');assert.equal(await page.locator('[data-param=voice]').isVisible(),true);assert.equal(await page.locator('[data-param=lyrics]').count(),0);assert.equal(await page.locator('#music-vocals').count(),0);
 await page.locator('#generation-prompt').fill('Welcome to our creative studio.');req=await submit();assert.equal(req.prepared.input.text,'Welcome to our creative studio.');assert.equal('lyrics' in req.prepared.input,false);
 await page.locator('#generation-model').selectOption('fal:fal-ai/elevenlabs/sound-effects/v2');assert.equal(await page.locator('[data-param=duration_seconds]').isVisible(),true);assert.equal(await page.locator('[data-param=voice]').count(),0);assert.equal((await page.locator('#model-capabilities').textContent()).includes('Speech from'),false);
 await page.locator('#generation-prompt').fill('Rain on a roof');await page.locator('[data-param=duration_seconds]').fill('12');req=await submit();assert.equal(req.prepared.input.duration_seconds,12);
 await page.locator('#generation-model').selectOption('stable-audio');assert.equal(await page.locator('#generation-duration').isVisible(),true);await page.locator('#generation-duration').selectOption('120');
 await page.getByRole('link',{name:'Home',exact:true}).click();await page.getByRole('link',{name:'Audio',exact:true}).click();await page.locator('#generation-duration').waitFor();assert.equal(await page.locator('#generation-duration').inputValue(),'120','Legacy duration draft survives route changes');
 const output=path.join(__dirname,'results/creative-apps/controls');await fs.mkdir(output,{recursive:true});
 await page.locator('#generation-model').selectOption('fal:fal-ai/ace-step');await page.screenshot({path:path.join(output,'audio-controls.png'),fullPage:true});
 await page.goto(BASE+'/apps/#create-video');await page.locator('#generation-model').waitFor();let checkedDurations=0;
 for(const m of MODELS.filter(m=>m.kind==='video')){
  await page.locator('#generation-model').selectOption(m.id);const duration=page.locator(m.schema?'[data-param=duration]':'#generation-duration');assert.equal(await duration.isVisible(),true,m.name+' shows duration without opening settings');
  const s=schemaShape(m.schema?.properties.duration||{});if(s.enum)assert.deepEqual(await duration.locator('option').evaluateAll(ns=>ns.map(n=>n.value)),s.enum);
  if(s.minimum!==undefined)assert.equal(Number(await duration.getAttribute('min')),s.minimum);if(s.maximum!==undefined)assert.equal(Number(await duration.getAttribute('max')),s.maximum);checkedDurations++;
 }
 await page.locator('#generation-model').selectOption('fal:fal-ai/veo3.1');await page.locator('#generation-prompt').fill('A gentle ocean wave');await page.locator('[data-param=duration]').selectOption('6s');req=await submit();assert.equal(req.prepared.input.duration,'6s');
 await page.locator('#generation-model').selectOption('fal:fal-ai/bytedance/seedance/v1.5/pro/image-to-video');
 const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#7a93f0';ctx.fillRect(0,0,256,256);return c.toDataURL('image/png').split(',')[1];}),'base64');
 await page.locator('#reference-file').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:png});await page.locator('.reference-tile').waitFor();await page.locator('[data-param=duration]').selectOption('7');req=await submit();assert.equal(req.prepared.input.duration,'7');assert.ok(req.prepared.input.image_url.startsWith('data:image/'),'Image references satisfy required media inputs');
 await page.screenshot({path:path.join(output,'video-controls.png'),fullPage:true});
 await page.goto(BASE+'/apps/#create-object');await page.locator('#generation-model').selectOption('fal:fal-ai/hunyuan-3d/v3.1/rapid/image-to-3d');await page.locator('#reference-file').setInputFiles({name:'object.png',mimeType:'image/png',buffer:png});await page.locator('.reference-tile').waitFor();req=await submit();assert.ok(req.prepared.input.input_image_url.startsWith('data:image/'),'3D image references populate Hunyuan input_image_url');
 // Test the actual first-use canvas, example layers, mask guard and persistence.
 await page.goto(BASE+'/apps/#canvas');await page.locator('#canvas-welcome').waitFor();assert.equal(await page.locator('#canvas-generate').isDisabled(),true);
 await page.locator('#canvas-example').click();assert.equal(await page.locator('#canvas-layers button').count(),4);assert.equal(await page.locator('#canvas-welcome').isVisible(),false);
 await page.locator('#canvas-inpaint').click();assert.ok((await page.locator('#toast').textContent()).includes('paint over the area'));
 await page.locator('#canvas-undo').click();await page.locator('#canvas-welcome').waitFor();await page.locator('#canvas-redo').click();await page.waitForFunction(()=>document.querySelectorAll('#canvas-layers button').length===4);
 await page.getByRole('link',{name:'Home',exact:true}).click();await page.getByRole('link',{name:'AI Canvas',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#canvas-layers button').length===4);
 await page.screenshot({path:path.join(output,'canvas-guided.png')});await page.locator('#canvas-new').click();assert.equal(await page.locator('#canvas-welcome').isVisible(),true);await page.waitForFunction(async()=>{const {get}=await import('/apps/studio/storage.js');return (await get('boards','canvas-current'))?.layers.length===0;});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#canvas-welcome').waitFor();assert.equal(await page.locator('#canvas-example').isVisible(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Canvas fits mobile viewport');assert.ok(await page.evaluate(()=>document.querySelector('#canvas-welcome').getBoundingClientRect().top<document.querySelector('.canvas-page .scene-side').getBoundingClientRect().top),'Mobile instructions appear before drawing tools');await page.screenshot({path:path.join(output,'canvas-mobile.png')});
 // Import and decode a real one-second WAV through the library, without a provider.
 const wav=Buffer.alloc(44+16000);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
 await page.goto(BASE+'/apps/#library');await page.locator('#global-upload').setInputFiles({name:'duration-check.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>{const a=document.querySelector('.audio-preview audio');return a&&Number.isFinite(a.duration);});assert.ok(await page.locator('.audio-preview audio').evaluate(a=>Math.abs(a.duration-1)<.05),'Audio card displays the decoded output duration');
 await page.goto(BASE+'/apps/#guide');await page.locator('.guide-grid').waitFor();assert.ok(await page.locator('.guide-grid .panel').count()>=20);
 assert.equal(errors.length,0,errors.join('\n'));await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({checkedDurations,audioPayloads:true,compatibleLyricsDraft:true,requiredImageReference:true,canvasGuidanceUndoPersistence:true,mobileCanvas:true,workflows:true,providerHTTP:'mocked, validated with real server adapter',errors},null,2));
 await browser.close();console.log('PASS visible audio/video controls, real adapter payload validation, draft persistence and guided canvas ('+checkedDurations+' video models; provider HTTP mocked).');
})().catch(e=>{console.error(e);process.exit(1);});
