import test from 'node:test';
import assert from 'node:assert/strict';
import {planRoute,bridgeRoute,sanitizeLocalModels} from '../lib/plan.mjs';

class Store {
 constructor(tenant='owner',map=new Map()){this.tenant=tenant;this.map=map;}
 async get(key){return structuredClone(this.map.get(this.tenant+':'+key));}
 async put(key,value){this.map.set(this.tenant+':'+key,structuredClone(value));}
}
const request=(path,data)=>new Request('https://app.test'+path,data===undefined?{}:{method:'POST',body:JSON.stringify(data)});
const account=s=>planRoute(request('/api/account'),s).then(r=>r.json());
const post=(s,path,data={})=>planRoute(request(path,data),s).then(r=>r.json());
const bridge=(s,path,data={})=>bridgeRoute(request('/api/bridge/'+path,data),s).then(r=>r.json());
const inventory=(models=['qwen3:4b'])=>({servers:[{id:'ollama',online:true,models:models.map(id=>({id,name:id,size_bytes:2500000000}))},{id:'lmstudio',online:true,models:[{id:'qwen3-8b-local',name:'Qwen 3 8B'}]}]});
const heartbeat=(s,models=inventory(),extra={})=>bridge(s,'next',{connector_id:'test-helper',signed_in:true,harness_version:2,local_models:models,...extra});
const pull=(s,model='qwen3:4b')=>post(s,'/api/account/local-model/pull',{model});

test('discovery drops remote endpoints, cloud models, embeddings, duplicate and malformed metadata',()=>{
 const data=sanitizeLocalModels({servers:[{id:'other',online:true,models:[{id:'model'}]},{id:'ollama',online:true,base_url:'https://paid.test',secret:'hidden',models:[
  {id:'qwen3:4b',name:'Qwen\u0000 3',size_bytes:123,url:'https://paid.test'},
  {id:'qwen3:4b',name:'duplicate'},
  {id:'qwen3:cloud'},
  {id:'qwen3:480b-cloud'},
  {id:'remote-alias',remote_host:'https://ollama.com'},
  {id:'remote-model-alias',remote_model:'cloud-model'},
  {id:'remote-flag',remote:true},
  {id:'embed',capabilities:['embedding']},
  {id:'embedding',type:'embedding'},
  {id:'bad\nmodel'},
  {id:'another',size_bytes:-1},
 ]}]});
 assert.deepEqual(data,{servers:[{id:'ollama',online:true,models:[{id:'qwen3:4b',name:'Qwen 3',size_bytes:123},{id:'another',name:'another'}]}]});
 assert.deepEqual(sanitizeLocalModels(null),{servers:[]});
});

test('discovered selection persists and routes the body to a fixed local service',async()=>{
 const s=new Store();await heartbeat(s);
 const selected=await post(s,'/api/account/local-model',{server:'lmstudio',model:'qwen3-8b-local',base_url:'https://ignored.test'});
 assert.deepEqual(selected.local_model,{server:'lmstudio',model:'qwen3-8b-local'});
 assert.deepEqual((await account(s)).local_model,selected.local_model);
 const {id}=await post(s,'/api/runs',{brief:'Draft a project checklist'}),run=await s.get('run:'+id);
 assert.equal(run.config.brain.model,'gpt-6-astra');
 assert.deepEqual(run.config.body,{backend:'chat',model:'qwen3-8b-local',base_url:'http://127.0.0.1:1234/v1',rates:null});
 await assert.rejects(()=>post(s,'/api/account/local-model',{server:'https://paid.test',model:'qwen3:4b'}),/not available/);
 await assert.rejects(()=>post(s,'/api/account/local-model',{server:'constructor',model:'qwen3:4b'}),/not available/);
});

test('a missing selected model blocks execution until explicitly cleared without a silent body fallback',async()=>{
 const s=new Store();await heartbeat(s);
 await post(s,'/api/account/local-model',{server:'ollama',model:'qwen3:4b'});
 await heartbeat(s,inventory([]));
 await assert.rejects(()=>post(s,'/api/runs',{brief:'A task'}),/selected local model is unavailable/);
 assert.equal(await s.get('active'),undefined);
 await post(s,'/api/account/local-model/clear');
 const {id}=await post(s,'/api/runs',{brief:'A task'});
 assert.equal((await s.get('run:'+id)).config.body.model,'gpt-5.6-luna');
});

test('downloads require a live helper, online Ollama, an allowlisted model and no active task',async()=>{
 const s=new Store();await assert.rejects(()=>pull(s),/Connect your helper/);
 await heartbeat(s,{servers:[]});await assert.rejects(()=>pull(s),/Open Ollama/);
 await heartbeat(s);await assert.rejects(()=>pull(s,'qwen3:480b-cloud'),/supported model downloads/);
 await assert.rejects(()=>pull(s,'qwen3:4b; rm -rf /'),/supported model downloads/);
 await post(s,'/api/runs',{brief:'A task'});await assert.rejects(()=>pull(s),/task is already running/);
});

test('downloads are claimed once, block tasks and auto-select only a verified completed model',async()=>{
 const s=new Store();await heartbeat(s,inventory([]));
 const queued=await pull(s);assert.equal(queued.local_action.status,'queued');
 await assert.rejects(()=>pull(s),/already in progress/);
 await assert.rejects(()=>post(s,'/api/runs',{brief:'A task'}),/download to finish/);
 const {action}=await heartbeat(s,inventory([]));assert(action.claim);assert.equal(action.status,'running');
 assert.equal((await heartbeat(s,inventory([]))).action,undefined);
 const view=await account(s);assert.equal(view.local_action.claim,undefined);assert.equal(view.local_action.connector_id,undefined);
 await assert.rejects(()=>bridge(s,'local-progress',{id:action.id,claim:'wrong',status:'completed'}),/Invalid model download claim/);
 await assert.rejects(()=>bridge(s,'local-progress',{id:action.id,claim:action.claim,status:'running',progress:Infinity}),/Invalid model download progress/);
 await bridge(s,'local-progress',{id:action.id,claim:action.claim,status:'running',progress:40,message:'Downloading model layer'});
 await assert.rejects(()=>post(s,'/api/runs',{brief:'A task'}),/download to finish/);
 const result=await bridge(s,'local-progress',{id:action.id,claim:action.claim,status:'completed',local_models:inventory()});
 assert.equal(result.action.status,'completed');assert.equal(result.stopped,true);
 assert.deepEqual((await account(s)).local_model,{server:'ollama',model:'qwen3:4b'});
 const {id}=await post(s,'/api/runs',{brief:'Use the downloaded model'});
 assert.equal((await s.get('run:'+id)).config.body.model,'qwen3:4b');
 await post(s,'/api/account/local-model/clear');
 await bridge(s,'local-progress',{id:action.id,claim:action.claim,status:'completed',local_models:inventory()});
 assert.equal((await account(s)).local_model,null,'replayed completion cannot change the selected model');
});

test('a claimed download may run before provider login, while reasoning tasks still require a subscription',async()=>{
 const s=new Store();await heartbeat(s,inventory([]),{signed_in:false,providers:{chatgpt:false,claude:false}});
 await pull(s);const {action}=await heartbeat(s,inventory([]),{signed_in:false,providers:{chatgpt:false,claude:false}});
 assert.equal(action.status,'running');
 await assert.rejects(()=>post(s,'/api/runs',{brief:'Task'}),/Connect a supported account/);
});

test('completion without installed inventory fails and never selects the requested model',async()=>{
 for(const local_models of [undefined,inventory([])]){
  const s=new Store();await heartbeat(s,inventory([]));await pull(s);const {action}=await heartbeat(s,inventory([]));
  const result=await bridge(s,'local-progress',{id:action.id,claim:action.claim,status:'completed',local_models});
  assert.equal(result.action.status,'failed');assert.match(result.action.error,/not found in Ollama/);
  assert.equal((await account(s)).local_model,null);
 }
});

test('long downloads stay active through progress, while stale claims fail without automatic replay',async t=>{
 let now=1800000000000;t.mock.method(Date,'now',()=>now);
 const s=new Store();await heartbeat(s,inventory([]));await pull(s);const {action}=await heartbeat(s,inventory([]));
 for(let i=0;i<4;i++){
  now+=4*60*1000;
  const result=await bridge(s,'local-progress',{id:action.id,claim:action.claim,status:'running',progress:10+i});
  assert.equal(result.stopped,false);
 }
 now+=6*60*1000;
 assert.equal((await account(s)).local_action.status,'failed');
 assert.equal((await heartbeat(s,inventory([]))).action,undefined);
 const result=await bridge(s,'local-progress',{id:action.id,claim:action.claim,status:'completed',local_models:inventory()});
 assert.equal(result.stopped,true);assert.equal(result.action.status,'failed');
 assert.equal((await account(s)).local_model,null);
 const retry=await pull(s);assert.notEqual(retry.local_action.id,action.id,'a fresh user request is required to retry');
});

test('stale queued downloads and missing Ollama are never dispatched later',async t=>{
 let now=1800000000000;t.mock.method(Date,'now',()=>now);
 const s=new Store();await heartbeat(s,inventory([]));await pull(s);now+=6*60*1000;
 assert.equal((await heartbeat(s,inventory([]))).action,undefined);
 assert.equal((await account(s)).local_action.status,'failed');
 await pull(s);assert.equal((await heartbeat(s,{servers:[]})).action,undefined);
 assert.match((await account(s)).local_action.error,/Ollama became unavailable/);
});

test('tenant stores keep inventories, selections and action claims separate',async()=>{
 const map=new Map(),alice=new Store('alice',map),bob=new Store('bob',map);
 await heartbeat(alice,inventory());await heartbeat(bob,inventory(['qwen3:8b']));
 await post(alice,'/api/account/local-model',{server:'ollama',model:'qwen3:4b'});
 assert.equal((await account(bob)).local_model,null);
 await assert.rejects(()=>post(bob,'/api/account/local-model',{server:'ollama',model:'qwen3:4b'}),/not available/);
 await pull(alice);const {action}=await heartbeat(alice);
 assert.equal((await account(bob)).local_action,null);
 await assert.rejects(()=>bridge(bob,'local-progress',{id:action.id,claim:action.claim,status:'completed',local_models:inventory()}),/Invalid model download claim/);
 const bobTask=await post(bob,'/api/runs',{brief:'Independent task'});
 assert.equal((await bob.get('run:'+bobTask.id)).config.body.model,'gpt-5.6-luna');
 assert.equal(await alice.get('run:'+bobTask.id),undefined);
});
