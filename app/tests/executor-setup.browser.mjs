// Browser integration against the actual plan/OpenRouter route code; only provider network and account login are fixtures.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs ACENET_TEST_URL=http://127.0.0.1:8776 node app/tests/executor-setup.browser.mjs
import assert from 'node:assert/strict';
import {planRoute} from '../../vercel/lib/plan.mjs';
import {seal} from '../../vercel/lib/openrouter.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
process.env.STORAGE_KEY='browser-fixture-only';
const nativeFetch=globalThis.fetch;
const freeModel={id:'test/body:free',hugging_face_id:'test/body',name:'Free fixture',pricing:{prompt:'0',completion:'0'},architecture:{output_modalities:['text']},context_length:32768};
globalThis.fetch=async(url)=>{if(url==='https://openrouter.ai/api/v1/auth/keys')return Response.json({key:'sk-or-browser-fixture'});if(url==='https://openrouter.ai/api/v1/models')return Response.json({data:[freeModel]});throw Error('Unexpected provider request');};
class Store{tenant='test';data=new Map();async get(k){return structuredClone(this.data.get(k));}async put(k,v){this.data.set(k,structuredClone(v));}}
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const origin=process.env.ACENET_TEST_URL||'http://127.0.0.1:8776';
const prior={id:'first',conversation_id:'first',title:'Use GBP',user_message:'Use GBP',source:{brief:'Use GBP',context:[]},config:{brain:{backend:'codex'}},report:{status:'accepted_by_astra'},result:{answer:'I will use GBP.',artifacts:[]},ledger:[],reviews:[],final:true};
async function fixture({connected=false}={}){
 const context=await browser.newContext(),page=await context.newPage(),store=new Store(),errors=[];let failStart=false;
 await store.put('bridge',{signed_in:true,seen:Date.now(),harness_version:3,providers:{chatgpt:true},openrouter_capable:true});await store.put('run:first',prior);
 if(connected)await store.put('openrouter-key',seal('sk-or-fixture',store.tenant));
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://openrouter.ai/auth?**',route=>{
  const callback=new URL(new URL(route.request().url()).searchParams.get('callback_url'));callback.searchParams.set('code','fixture-code');
  const denied=new URL(callback);denied.searchParams.delete('code');denied.searchParams.set('error','access_denied');
  return route.fulfill({contentType:'text/html',body:`<h1>OpenRouter provider fixture</h1><a href="${callback.href.replaceAll('&','&amp;')}">Finish sign-in</a><a href="${denied.href.replaceAll('&','&amp;')}">Decline</a>`});
 });
 await context.route('**/api/**',async route=>{
  const req=route.request(),u=new URL(req.url()),path=u.pathname;let response;
  try{
   if(path==='/api/bootstrap')response=Response.json({locked:false,token:'fixture-session',state_poll:true});
   else if(path==='/api/state')response=Response.json({account:await (await planRoute(new Request(new URL('/api/account',origin)),store)).json(),runs:[...store.data.entries()].filter(([k])=>k.startsWith('run:')).map(([,v])=>v).reverse(),detail:await store.get('run:'+u.searchParams.get('selected'))||null});
   else if(path.startsWith('/api/runs/')&&req.method()==='GET')response=Response.json(await store.get('run:'+path.split('/')[3]));
   else if(path.endsWith('/start')&&failStart)response=Response.json({error:'Connection is temporarily unavailable.'},{status:400});
   else response=await planRoute(new Request(req.url(),{method:req.method(),...(req.method()==='POST'?{body:req.postData()}: {})}),store);
   if(!response)throw Error('Unexpected fixture route '+path);
  }catch(e){response=Response.json({error:e.message},{status:400});}
  await route.fulfill({status:response.status,body:await response.text(),contentType:'application/json'});
 });
 await page.goto(origin);await page.waitForFunction(()=>typeof S!=='undefined'&&!S.locked&&!!S.account);
 return {context,page,store,errors,runs:()=>[...store.data.entries()].filter(([k])=>k.startsWith('run:')&&k!=='run:first').map(([,r])=>r),fail:()=>{failStart=true;}};
}
async function typeAndConnect(f,text='yo'){await f.page.locator('#task').fill(text);await f.page.locator('#submit').click();await f.page.waitForURL('https://openrouter.ai/auth?**');assert.equal(f.context.pages().length,1);}
try{
 const f=await fixture();await f.page.evaluate(async()=>{await openRun('first');S.files=[{name:'numbers.txt',content:'42'}];files();});
 await typeAndConnect(f,'Double those figures');await f.page.getByRole('link',{name:'Finish sign-in'}).click();await f.page.waitForFunction(()=>typeof S!=='undefined'&&S.selected&&S.selected!=='first');
 assert.equal(f.runs().length,1);const run=f.runs()[0];assert.equal(run.parent_id,'first');assert.equal(run.user_message,'Double those figures');assert(run.source.brief.includes('Use GBP'));assert.deepEqual(run.source.context,[{name:'numbers.txt',content:'42'}]);assert.equal(run.config.body.backend,'openrouter');assert.equal(run.config.brain.model,'gpt-6-astra');assert.equal(await f.page.locator('dialog[open]').count(),0);assert.equal(f.context.pages().length,1);
 await f.page.reload();await f.page.waitForFunction(()=>typeof S!=='undefined'&&!!S.account);assert.equal(f.runs().length,1);assert.deepEqual(f.errors,[]);await f.context.close();
 // Models also returns to the draft, without automatically sending a settings-only connection.
 const settings=await fixture();await settings.page.locator('#task').fill('Keep this draft');await settings.page.locator('#model-settings').click();await settings.page.locator('#openrouter-connect').click();await settings.page.waitForURL('https://openrouter.ai/auth?**');await settings.page.getByRole('link',{name:'Finish sign-in'}).click();await settings.page.waitForFunction(()=>typeof S!=='undefined'&&S.restoredDraft);assert.equal(await settings.page.locator('#task').inputValue(),'Keep this draft');assert.equal(await settings.page.locator('dialog[open]').count(),0);assert.equal(settings.runs().length,0);await settings.context.close();
 for(const exit of ['back','denied','expired']){
  const f=await fixture();await typeAndConnect(f,'Preserve '+exit);
  if(exit==='back')await f.page.goBack();
  else {if(exit==='expired'){const pending=await f.store.get('openrouter-pkce');await f.store.put('openrouter-pkce',{...pending,expires:0});}await f.page.getByRole('link',{name:exit==='denied'?'Decline':'Finish sign-in'}).click();}
  await f.page.waitForFunction(()=>typeof S!=='undefined'&&!S.connecting&&$('task').value.startsWith('Preserve'));assert.equal(await f.page.locator('#task').inputValue(),'Preserve '+exit);assert.equal(f.runs().length,0);assert.equal(await f.page.locator('dialog[open]').count(),0);assert.deepEqual(f.errors,[]);
  await f.page.locator('#new').click();assert.equal(await f.page.locator('#task').inputValue(),'');await f.context.close();
 }
 const failed=await fixture();failed.fail();await failed.page.locator('#task').fill('Still here');await failed.page.locator('#submit').click();await failed.page.getByText('Connection is temporarily unavailable.',{exact:true}).first().waitFor();assert.equal(await failed.page.locator('#task').inputValue(),'Still here');assert.equal(failed.runs().length,0);assert.equal(failed.context.pages().length,1);await failed.context.close();
 const ready=await fixture({connected:true});await ready.page.locator('#task').fill('Send now');await ready.page.locator('#submit').click();await ready.page.waitForFunction(()=>typeof S!=='undefined'&&!!S.selected);assert.equal(ready.runs().length,1);assert.equal(await ready.page.locator('dialog[open]').count(),0);await ready.context.close();
 const mobile=await fixture();await mobile.page.setViewportSize({width:390,height:844});assert(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.page.screenshot({path:process.env.ACENET_SCREENSHOT||'/tmp/acenet-connection-inline.png'});assert.deepEqual(mobile.errors,[]);await mobile.context.close();
 console.log('PASS same-tab sign-in with real routing: draft/files/chat restored, auto-send once, automatic free model, settings without send, Back/decline/expiry, start failure, connected users, no popups/stacked dialogs, mobile. Provider network and account login are fixtures.');
}finally{globalThis.fetch=nativeFetch;await browser.close();}
