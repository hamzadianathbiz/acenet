// Run against prepared static assets with Playwright installed; API/provider calls are fixtures.
// ACENET_TEST_URL=http://127.0.0.1:8776 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node app/tests/executor-setup.browser.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const origin=process.env.ACENET_TEST_URL||'http://127.0.0.1:8776';
const accepted={id:'first',conversation_id:'first',user_message:'Use GBP',source:{brief:'Use GBP',context:[]},config:{brain:{backend:'codex'}},report:{status:'accepted_by_astra'},result:{answer:'I will use GBP.',artifacts:[]},ledger:[],reviews:[],final:true};
async function fixture({connected=false,stale=false}={}){
 const context=await browser.newContext(),page=await context.newPage(),posted=[],errors=[];let actualConnected=connected,run=null,finished=false;
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://openrouter.ai/**',route=>route.fulfill({contentType:'text/html',body:'<h1>OpenRouter fixture</h1>'}));
 await context.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let value={};
  const account={online:true,signed_in:true,harness_version:3,providers:{chatgpt:true},openrouter_capable:true,openrouter:{connected:actualConnected||stale&&!finished},local_model:null};
  if(path==='/api/bootstrap')value={locked:false,token:'fixture-token',state_poll:true};
  else if(path==='/api/state')value={account,runs:[...(run?[run]:[]),accepted],detail:run||accepted};
  else if(path==='/api/account/openrouter/start')value={url:'https://openrouter.ai/auth?fixture=1'};
  else if(path==='/api/account/openrouter/finish'){actualConnected=true;finished=true;value={connected:true};}
  else if(path==='/api/account/openrouter/models')value={models:[]};
  else if(path==='/api/runs'&&req.method()==='POST'){
   if(!actualConnected)return route.fulfill({status:400,json:{error:'Connect free models to continue.',code:'executor_setup_required'}});
   posted.push(req.postDataJSON());run={...accepted,id:'next',parent_id:posted.at(-1).parent_id,user_message:posted.at(-1).brief,report:{status:'queued'},result:null,final:false};value={id:'next'};
  }else if(path==='/api/runs/first')value=accepted;
  else if(path==='/api/runs/next')value=run;
  else throw Error('Unexpected fixture route '+path);
  await route.fulfill({json:value});
 });
 await page.goto(origin);await page.waitForFunction(()=>!S.locked&&!!S.account);
 return {context,page,posted,errors,connect:()=>{actualConnected=true;finished=true;}};
}
try{
 // Missing setup opens a direct action before queueing; OAuth retains the follow-up and files.
 const f=await fixture();await f.page.evaluate(async()=>{await openRun('first');S.files=[{name:'numbers.txt',content:'42'}];files();});
 await f.page.locator('#task').fill('Double that');await f.page.locator('#task').press('Enter');
 await f.page.locator('#executor-setup').waitFor({state:'visible'});assert.equal(f.posted.length,0);assert(await f.page.locator('#error').isHidden());
 const popupPromise=f.context.waitForEvent('page');await f.page.getByRole('button',{name:'Connect free models',exact:true}).click();const popup=await popupPromise;
 await popup.waitForURL('https://openrouter.ai/**');assert.equal(new URL(f.page.url()).origin,new URL(origin).origin);
 assert.equal(await f.page.locator('#task').inputValue(),'Double that');
 await popup.goto(origin+'/?or_state=fixture-state&code=fixture-code').catch(e=>{if(!/closed/.test(e.message))throw e;});
 await f.page.waitForFunction(()=>!S.executorPending,{timeout:15000});
 assert.equal(f.posted.length,1);assert.equal(f.posted[0].parent_id,'first');assert.equal(f.posted[0].brief,'Double that');assert.deepEqual(f.posted[0].context,[{name:'numbers.txt',content:'42'}]);assert(await f.page.locator('#executor-setup').isHidden());
 await f.page.evaluate(()=>refresh());assert.equal(f.posted.length,1);assert.deepEqual(f.errors,[]);await f.context.close();
 // Cancellation and New chat never send a pending message after a later connection.
 for(const abandon of ['close','new']){const f=await fixture();await f.page.locator('#task').fill('Keep me');await f.page.locator('#submit').click();await f.page.locator('#executor-close').click();if(abandon==='new')await f.page.locator('#new').click();f.connect();await f.page.evaluate(()=>refresh());assert.equal(f.posted.length,0);assert.equal(await f.page.locator('#task').inputValue(),abandon==='new'?'':'Keep me');await f.context.close();}
 // Popup blocking supplies a real link without navigating away or dropping attachments.
 const blocked=await fixture();await blocked.page.evaluate(()=>window.open=()=>null);await blocked.page.locator('#task').fill('yo');await blocked.page.locator('#submit').click();await blocked.page.locator('#executor-connect').click();await blocked.page.locator('#executor-signin').waitFor({state:'visible'});assert.equal(await blocked.page.locator('#task').inputValue(),'yo');await blocked.page.setViewportSize({width:390,height:844});assert(await blocked.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(blocked.errors,[]);await blocked.context.close();
 // Already connected accounts send immediately, without manual model selection.
 const ready=await fixture({connected:true});await ready.page.locator('#task').fill('yo');await ready.page.locator('#submit').click();await ready.page.waitForFunction(()=>$('task').value==='');assert.equal(ready.posted.length,1);assert(await ready.page.locator('#executor-setup').isHidden());await ready.context.close();
 // A stale connected state is recovered using the server's setup code, not an amber dead end.
 const stale=await fixture({stale:true});await stale.page.locator('#task').fill('retry');await stale.page.locator('#submit').click();await stale.page.locator('#executor-setup').waitFor({state:'visible'});assert(await stale.page.locator('#error').isHidden());assert.equal(stale.posted.length,0);await stale.context.close();
 console.log('PASS: OAuth resume exactly once, follow-up/files preserved, cancel/New chat, blocked popup, mobile, existing connection and stale-state recovery; API fixtures only.');
}finally{await browser.close();}
