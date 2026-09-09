import {DurableObject} from 'cloudflare:workers';
import {assets} from './assets.generated.mjs';
import {BRAIN,BODIES,DONE,PLAN,RESULT,REVIEW,assert,checkPlan,safeResult,accepted,tokenCost,pickBody,normalizeInput,candidateModels,promptFor,reportCost,modelCall,boundedJSON} from './core.mjs';
const enc=new TextEncoder();
const json=(v,status=200,headers={})=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const bytes=s=>enc.encode(s);
const hex=a=>Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('');
async function digest(s){return hex(await crypto.subtle.digest('SHA-256',bytes(s)));}
async function signature(secret,text){const key=await crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,bytes(text)));}
async function session(request,env){const cookie=request.headers.get('Cookie')?.match(/(?:^|; )acenet=([0-9]+)\.([a-f0-9]+)/);if(!cookie||Number(cookie[1])<Date.now())return null;const sig=await signature(env.APP_PASSWORD,cookie[1]);return sig===cookie[2]?sig:null;}
export default {async fetch(request,env){try{
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/')){const asset=assets[url.pathname];if(!asset)return new Response('Not found',{status:404});return new Response(Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Referrer-Policy':'no-referrer','Cache-Control':'no-cache'}});}
 if(!env.APP_PASSWORD||!env.STORAGE_KEY)return json({error:'Workspace secrets have not been configured.'},503);
 const auth=await session(request,env);if(request.method!=='GET'){assert('Origin not allowed.',request.headers.get('Origin')===url.origin);if(url.pathname!=='/api/setup')assert('Unlock the workspace first.',auth&&request.headers.get('X-ACENET-Token')===auth);}
 if(!auth&&!['/api/bootstrap','/api/setup'].includes(url.pathname))return json({error:'Unlock the workspace in Connections.'},401);
 const headers=new Headers(request.headers);headers.set('X-Workspace-Authenticated',auth||'');
 return env.WORKSPACE.get(env.WORKSPACE.idFromName('owner')).fetch(new Request(request,{headers}));
 }catch(e){return json({error:e.message},400);}}};
export class Workspace extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;}
 async seal(value){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',bytes(this.env.STORAGE_KEY)),'AES-GCM',false,['encrypt']);const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes(JSON.stringify(value)));return {iv:Array.from(iv),data:Array.from(new Uint8Array(data))};}
 async keys(){const v=await this.ctx.storage.get('keys');if(!v)return {};const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',bytes(this.env.STORAGE_KEY)),'AES-GCM',false,['decrypt']);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(v.iv)},key,new Uint8Array(v.data))));}
 async save(r){reportCost(r);assert('Run exceeds the storage size limit.',bytes(JSON.stringify(r)).length<1900000);await this.ctx.storage.put('run:'+r.id,r);}
 public(r){return {...r,final:['accepted_by_astra','baseline_complete'].includes(r.report.status),cancellable:!DONE.has(r.report.status)};}
 async fetch(request){try{
 const url=new URL(request.url),path=url.pathname,auth=request.headers.get('X-Workspace-Authenticated');
 if(path==='/api/bootstrap')return json({cloud:true,locked:!auth,token:auth,api_key_available:auth?Boolean((await this.keys()).api_key):false,defaults:{brain:BRAIN,body:BODIES[1],max_calls:12,max_repairs:1},example:'Write a Python function that normalizes and deduplicates email addresses while preserving order. Include input validation, a docstring and meaningful example tests. Return the complete file.'});
 assert('Method not allowed.',['GET','POST'].includes(request.method));
 let d={};if(request.method==='POST')d=await boundedJSON(request,200000);
 if(path==='/api/setup'&&request.method==='POST'){
  const failures=await this.ctx.storage.get('login')||{count:0,until:0};if(failures.until>Date.now())return json({error:'Too many attempts. Try again in one minute.'},429);
  if(!auth&&await digest(String(d.password||''))!==await digest(this.env.APP_PASSWORD)){await this.ctx.storage.put('login',{count:failures.count+1,until:failures.count>=4?Date.now()+60000:0});return json({error:'Incorrect workspace password.'},401);}
  await this.ctx.storage.put('login',{count:0,until:0});const keys=await this.keys();for(const k of ['api_key','body_key'])if(typeof d[k]==='string'&&d[k].trim()){assert('Key is too long.',d[k].length<4096);keys[k]=d[k].trim();}await this.ctx.storage.put('keys',await this.seal(keys));
  const expiry=String(Date.now()+86400000),token=await signature(this.env.APP_PASSWORD,expiry);return json({token,api_key_available:Boolean(keys.api_key)},200,{'Set-Cookie':`acenet=${expiry}.${token}; HttpOnly; ${url.hostname==='localhost'||url.hostname==='127.0.0.1'?'':'Secure; '}SameSite=Strict; Path=/; Max-Age=86400`});
 }
 assert('Unauthorized.',Boolean(auth));
 if(path==='/api/runs'&&request.method==='GET'){const all=await this.ctx.storage.list({prefix:'run:'});return json([...all.values()].map(r=>({id:r.id,title:r.title,created:r.created,mode:r.mode,report:r.report})).sort((a,b)=>b.created.localeCompare(a.created)));}
 if(path==='/api/runs'&&request.method==='POST')return json(await this.start(d));
 if(path==='/api/models'&&request.method==='POST'){const models=candidateModels({routing:'manual',body:{backend:'chat',model:'discovery',base_url:d.base_url}}),key=d.key||(await this.keys()).body_key;const r=await fetch(models[0].base_url+'/models',{headers:key?{Authorization:'Bearer '+key}:{},redirect:'error',signal:AbortSignal.timeout(15000)});assert('Model server refused discovery.',r.ok);const result=await boundedJSON(r,100000);return json({models:(result.data||[]).map(m=>m.id).filter(id=>typeof id==='string').slice(0,100)});}
 const match=path.match(/^\/api\/runs\/([a-zA-Z0-9-]+)(?:\/(download|cancel|baseline|compare))?$/);assert('Route not found.',match);const r=await this.ctx.storage.get('run:'+match[1]);assert('Run not found.',r);
 if(!match[2]&&request.method==='GET')return json(this.public(r));
 if(match[2]==='download'&&request.method==='GET'){assert('Only accepted output can be downloaded.',this.public(r).final);const file=url.searchParams.get('path');const artifact=file?r.result.artifacts.find(a=>a.path===file):null;assert('File not found.',!file||artifact);return new Response(artifact?artifact.content:r.result.answer,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="'+(artifact?artifact.path.split('/').pop().replace(/[^a-zA-Z0-9._-]/g,'_'):'answer.md')+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 assert('Method not allowed.',request.method==='POST');
 if(match[2]==='cancel'){r.report.status='cancelled';r.report.error='Stopped. An in-flight provider call may still be billed.';await this.save(r);return json({ok:true});}
 if(match[2]==='baseline')return json(await this.start({...r.source,config:r.config},true));
 if(match[2]==='compare'){const b=await this.ctx.storage.get('run:'+d.baseline_id);assert('Choose a completed matching baseline.',b&&b.mode==='baseline'&&b.report.status==='baseline_complete'&&b.report.input_sha256===r.report.input_sha256);const a=r.report.total_cost_usd,c=b.report.total_cost_usd,ratio=a!=null&&c>0?a/c:null;return json({mixed_cost_usd:a,baseline_cost_usd:c,cost_ratio:ratio,tenfold_cost_target_met:ratio!=null&&ratio<=.1});}
 return json({error:'Not found'},404);
 }catch(e){return json({error:e.message},400);}}
 async start(d,baseline=false){
 const current=await this.ctx.storage.get('active');if(current){const r=await this.ctx.storage.get('run:'+current);assert('One task is already running or stopping.',!r||DONE.has(r.report.status)&&!r.pending);}
 assert('Connect an OpenAI API key in Connections.',Boolean((await this.keys()).api_key));
 const {source,calls,repairs}=normalizeInput(d),models=candidateModels(d.config);const id=crypto.randomUUID();
 const r={id,title:source.brief.trim().slice(0,96),created:new Date().toISOString(),source,config:{brain:BRAIN,body:models.length===1?models[0]:BODIES[1],routing:d.config?.routing||'auto',max_calls:calls,max_repairs:repairs},models,mode:baseline?'baseline':'mixed',blueprint:null,result:null,reviews:[],steps:[],routing:[],ledger:[],phase:baseline?'baseline':'plan',step:0,repairs:0,report:{status:'queued',input_sha256:await digest(JSON.stringify(source))}};
 await this.ctx.storage.transaction(async tx=>{const active=await tx.get('active');const prior=active?await tx.get('run:'+active):null;assert('One task is already running or stopping.',!prior||DONE.has(prior.report.status)&&!prior.pending);await tx.put('run:'+id,r);await tx.put('active',id);await tx.setAlarm(Date.now()+100);});return {id};
 }
 async alarm(){const id=await this.ctx.storage.get('active');if(!id)return;let r=await this.ctx.storage.get('run:'+id);if(!r||DONE.has(r.report.status))return;
 try{
  assert('A provider call was interrupted. Its cost is unknown. Start a new run; this call will not be retried automatically.',!r.pending);
  assert('Call limit reached before acceptance.',r.ledger.length<r.config.max_calls);
  const role=r.phase,schema=role==='plan'?PLAN:role==='review'?REVIEW:RESULT;
  let data={source:r.source,deliverable_schema:RESULT};
  if(role==='plan')data.catalog=r.models;
  else if(role!=='baseline'){data.blueprint=r.blueprint;if(role==='execute'){data.step=r.blueprint.steps[r.step];data.dependencies=r.steps.filter(x=>data.step.depends_on.includes(x.id));}else if(role==='assemble'){data.steps=r.steps;data.candidate=r.result;data.feedback=r.reviews.at(-1)||null;}else data.candidate=r.result;}
  const prompt=promptFor(role,data,schema);let model=BRAIN,output=role==='plan'||role==='review'?4096:8192;
  if(role==='execute'||role==='assemble'){const step=r.blueprint.steps[r.step];const eligible=role==='execute'?step.eligible_models:r.models.filter(m=>r.blueprint.steps.every(s=>s.eligible_models.includes(m.id))).map(m=>m.id);model=pickBody(r.models,eligible,bytes(prompt).length,output);r.routing.push({role,model:model.model,reason:`${role}: ${model.model} had the lowest configured token estimate among Astra's eligible models that fit the complete context.`});}
  assert('The complete prompt exceeds the model context limit.',bytes(prompt).length+output<model.context);
  const entry={role,model:model.model,status:'started',usage:null,cost_usd:null};r.ledger.push(entry);r.pending=true;r.report.status='running';await this.save(r);
  // A watchdog detects interruption without replaying a potentially billed request.
  await this.ctx.storage.setAlarm(Date.now()+240000);
  const started=Date.now();const response=await modelCall(this.env,await this.keys(),model,prompt,schema,output);entry.seconds=Number(((Date.now()-started)/1000).toFixed(2));entry.usage=response.usage;entry.cost_usd=tokenCost(response.usage,model.rates);entry.status='completed';r.pending=false;
  const latest=await this.ctx.storage.get('run:'+id);if(latest.report.status==='cancelled'){latest.ledger=r.ledger;latest.pending=false;await this.save(latest);return;}
  // Persist usage before validating output so malformed JSON is still charged.
  await this.save(r);const result=JSON.parse(response.text);
  if(role==='plan'){checkPlan(result,r.models);r.blueprint=result;r.phase='execute';}
  else if(role==='review'){const pass=accepted(result,r.blueprint);r.reviews.push(result);if(pass)r.report.status='accepted_by_astra';else if(r.repairs<r.config.max_repairs){r.repairs++;r.phase='assemble';}else r.report.status='needs_human_review';}
  else{safeResult(result);if(role==='baseline'){r.result=result;r.report.status='baseline_complete';}else if(role==='execute'){r.steps.push({id:r.blueprint.steps[r.step].id,result});r.step++;if(r.step===r.blueprint.steps.length){r.result=result;r.phase=r.steps.length===1?'review':'assemble';}}else{r.result=result;r.phase='review';}}
  await this.save(r);if(!DONE.has(r.report.status))await this.ctx.storage.setAlarm(Date.now()+100);else await this.ctx.storage.deleteAlarm();
 }catch(e){const latest=await this.ctx.storage.get('run:'+id);if(latest?.report.status==='cancelled'){latest.pending=false;await this.save(latest);return;}r.pending=false;r.report.status='failed';r.report.error=e.message;if(r.ledger.at(-1)?.status==='started')r.ledger.at(-1).status='failed';await this.save(r);await this.ctx.storage.deleteAlarm();}}
}
