import test from 'node:test';import assert from 'node:assert/strict';
import {freeModels,seal,unseal,openrouterRoute,openrouterCredential,openrouterStatus} from '../lib/openrouter.mjs';
import {planRoute,bridgeRoute} from '../lib/plan.mjs';
process.env.STORAGE_KEY='test-only-storage-key';
class Store{constructor(tenant='a'){this.tenant=tenant;this.m=new Map();}async get(k){return structuredClone(this.m.get(k));}async put(k,v){this.m.set(k,structuredClone(v));}}
const req=(p,d)=>new Request('https://app.test'+p,d===undefined?{}:{method:'POST',body:JSON.stringify(d)});
const model={hugging_face_id:'test/body',id:'test/body:free',name:'Test',pricing:{prompt:'0',completion:'0',request:'0'},architecture:{output_modalities:['text']},context_length:32768};
test('catalog rejects paid, missing pricing, request fees, small contexts and non-free variants',()=>{const rows=[model,{...model,id:'paid'},{...model,pricing:{prompt:'0',completion:'.1'}},{...model,pricing:{prompt:'0'}},{...model,pricing:{prompt:null,completion:'0'}},{...model,pricing:{prompt:'0',completion:'0',request:'.01'}},{...model,context_length:4096}];assert.deepEqual(freeModels({data:rows}).map(m=>m.id),[model.id]);});
test('OpenRouter keys are encrypted with tenant binding and never returned in status',async()=>{const s=new Store();const encrypted=seal('sk-or-private',s.tenant);assert(!JSON.stringify(encrypted).includes('sk-or-private'));assert.equal(unseal(encrypted,'a'),'sk-or-private');assert.throws(()=>unseal(encrypted,'b'));await s.put('openrouter-key',encrypted);assert.deepEqual(await openrouterStatus(s),{connected:true});});
test('OAuth requires matching tenant state and one provider exchange; successful retries reuse the connection',async t=>{const a=new Store('a'),b=new Store('b');const start=await (await openrouterRoute(req('/api/account/openrouter/start',{}),a)).json();const url=new URL(start.url);assert.equal(url.origin,'https://openrouter.ai');assert.equal(url.searchParams.get('code_challenge_method'),'S256');const state=new URL(url.searchParams.get('callback_url')).searchParams.get('or_state');await assert.rejects(()=>openrouterRoute(req('/api/account/openrouter/finish',{state,code:'code'}),b));await assert.rejects(()=>openrouterRoute(req('/api/account/openrouter/finish',{state:'wrong',code:'code'}),a));t.mock.method(globalThis,'fetch',async(u,o)=>{assert.equal(u,'https://openrouter.ai/api/v1/auth/keys');assert.equal(JSON.parse(o.body).code_challenge_method,'S256');return Response.json({key:'sk-or-user-controlled'});});await openrouterRoute(req('/api/account/openrouter/finish',{state,code:'code'}),a);assert.deepEqual(await (await openrouterRoute(req('/api/account/openrouter/finish',{state,code:'code'}),a)).json(),{connected:true});assert.equal(globalThis.fetch.mock.callCount(),1);await assert.rejects(()=>openrouterRoute(req('/api/account/openrouter/finish',{state,code:'different-code'}),a));await a.put('local-model',{server:'openrouter',model:model.id});await openrouterRoute(req('/api/account/openrouter/disconnect',{}),a);assert.equal(await a.get('openrouter-key'),null);assert.equal(await a.get('local-model'),null);});
test('free body routing requires current helper and connected key; credential requires exact active claim',async t=>{t.mock.method(globalThis,'fetch',async()=>Response.json({data:[model]}));const s=new Store();await s.put('bridge',{signed_in:true,harness_version:3,seen:Date.now(),openrouter_capable:true,providers:{chatgpt:true}});await s.put('openrouter-key',seal('sk-or-test',s.tenant));await openrouterRoute(req('/api/account/openrouter/select',{model:model.id}),s);const {id}=await (await planRoute(req('/api/runs',{brief:'Task'}),s)).json();assert.equal((await s.get('run:'+id)).config.body.backend,'openrouter');await assert.rejects(()=>openrouterCredential(req('/api/bridge/openrouter-key',{id,claim:'bad'}),s));const {run}=await (await bridgeRoute(req('/api/bridge/next',{connector_id:'test',signed_in:true,harness_version:3,openrouter_capable:true}),s)).json();const result=await (await bridgeRoute(req('/api/bridge/openrouter-key',{id,claim:run.claim}),s)).json();assert.equal(result.key,'sk-or-test');run.report.status='cancelled';await s.put('run:'+id,run);await assert.rejects(()=>openrouterCredential(req('/api/bridge/openrouter-key',{id,claim:run.claim}),s));});
test('expired OAuth state cannot exchange a code',async()=>{const s=new Store();await s.put('openrouter-pkce',{state:'old',verifier:'x',expires:0});await assert.rejects(()=>openrouterRoute(req('/api/account/openrouter/finish',{state:'old',code:'code'}),s));});
test('old helper and paid model selection are rejected',async t=>{t.mock.method(globalThis,'fetch',async()=>Response.json({data:[model]}));const s=new Store();await s.put('openrouter-key',seal('sk-or-test',s.tenant));await assert.rejects(()=>openrouterRoute(req('/api/account/openrouter/select',{model:'test/body'}),s));await s.put('local-model',{server:'openrouter',model:model.id});await s.put('bridge',{signed_in:true,harness_version:3,seen:Date.now(),providers:{chatgpt:true}});await assert.rejects(()=>planRoute(req('/api/runs',{brief:'Task'}),s),/Update your helper/);});

const draft={task:'Continue with these figures',context:[{name:'figures.csv',content:'42'}],parent_id:null,provider:'auto',drive_query:'',drive_provider:'chatgpt',resume:true};
test('OAuth preserves a bounded private draft; restore cannot cross tenants or resume twice',async t=>{
 const a=new Store('a'),b=new Store('b');await a.put('run:prior',{id:'prior'});
 const started=await (await openrouterRoute(req('/api/account/openrouter/start',{draft:{...draft,parent_id:'prior'}}),a)).json();
 assert(!started.url.includes('figures'));assert(!started.url.includes('Continue'));
 assert.deepEqual(await (await openrouterRoute(req('/api/account/openrouter/restore',{state:started.state}),b)).json(),{draft:null});
 t.mock.method(globalThis,'fetch',async()=>Response.json({key:'sk-or-user'}));
 await openrouterRoute(req('/api/account/openrouter/finish',{state:started.state,code:'valid'}),a);
 const first=await (await openrouterRoute(req('/api/account/openrouter/restore',{state:started.state}),a)).json();
 assert.equal(first.auto_resume,true);assert.deepEqual(first.draft,{...draft,parent_id:'prior'});
 const again=await (await openrouterRoute(req('/api/account/openrouter/restore',{state:started.state}),a)).json();assert.equal(again.auto_resume,false);assert.deepEqual(again.draft,first.draft);
});
test('cancelled and expired sign-in restore the draft without sending; expired drafts are cleared',async()=>{
 const s=new Store();const {state}=await (await openrouterRoute(req('/api/account/openrouter/start',{draft}),s)).json();
 const pending=await s.get('openrouter-pkce');await s.put('openrouter-pkce',{...pending,expires:0});
 await assert.rejects(()=>openrouterRoute(req('/api/account/openrouter/finish',{state,code:'expired'}),s),/expired/);
 const restored=await (await openrouterRoute(req('/api/account/openrouter/restore',{state}),s)).json();assert.deepEqual(restored.draft,draft);assert.equal(restored.auto_resume,false);
 await s.put('openrouter-pkce',{...pending,draft_expires:0});assert.equal((await (await openrouterRoute(req('/api/account/openrouter/restore',{state}),s)).json()).draft,null);assert.equal((await s.get('openrouter-pkce')).draft,null);
});
test('foreign parents, oversized drafts and invalid fields never start OAuth',async()=>{
 for(const change of [{parent_id:'other-tenant-run'},{context:[{name:'huge',content:'x'.repeat(150000)}]},{drive_provider:'wrong'},{resume:'yes'}]){const s=new Store();await assert.rejects(()=>openrouterRoute(req('/api/account/openrouter/start',{draft:{...draft,...change}}),s));assert.equal(await s.get('openrouter-pkce'),undefined);}
});


test('a connected account does not restart OAuth or overwrite its credential and draft',async()=>{
 const s=new Store();const key=seal('sk-or-still-connected',s.tenant),pending={state:'original',draft:{task:'Keep this'}};
 await s.put('openrouter-key',key);await s.put('openrouter-pkce',pending);
 assert.deepEqual(await (await openrouterRoute(req('/api/account/openrouter/start',{draft}),s)).json(),{connected:true});
 assert.deepEqual(await s.get('openrouter-key'),key);assert.deepEqual(await s.get('openrouter-pkce'),pending);
});

test('callback recovery returns only the current tenant state, never draft or verifier, and expires',async()=>{
 const a=new Store('a'),b=new Store('b');const started=await (await openrouterRoute(req('/api/account/openrouter/start',{draft}),a)).json();
 const pending=await openrouterRoute(req('/api/account/openrouter/pending'),a);
 assert.equal(pending.headers.get('Cache-Control'),'no-store');assert.deepEqual(await pending.json(),{state:started.state});
 assert.deepEqual(await (await openrouterRoute(req('/api/account/openrouter/pending'),b)).json(),{state:null});
 await a.put('openrouter-pkce',{...await a.get('openrouter-pkce'),expires:0});
 assert.deepEqual(await (await openrouterRoute(req('/api/account/openrouter/pending'),a)).json(),{state:null});
});
