import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {assert,normalizeInput} from './core.mjs';
const json=v=>Response.json(v,{headers:{'Cache-Control':'no-store'}});
const hash=v=>createHash('sha256').update(v).digest();
function encryptionKey(){assert('Account encryption unavailable.',!!process.env.STORAGE_KEY);return hash('acenet-openrouter-v1:'+process.env.STORAGE_KEY);}
export function seal(key,tenant=''){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);cipher.setAAD(Buffer.from(tenant));const data=Buffer.concat([cipher.update(key,'utf8'),cipher.final()]);return {iv:iv.toString('base64'),data:data.toString('base64'),tag:cipher.getAuthTag().toString('base64')};}
export function unseal(value,tenant=''){const cipher=createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(value.iv,'base64'));cipher.setAAD(Buffer.from(tenant));cipher.setAuthTag(Buffer.from(value.tag,'base64'));return Buffer.concat([cipher.update(Buffer.from(value.data,'base64')),cipher.final()]).toString('utf8');}
async function remote(path,options={}){let response;try{response=await fetch('https://openrouter.ai/api/v1/'+path,{...options,redirect:'manual',signal:AbortSignal.timeout(12000)});}catch{throw new Error('OpenRouter could not be reached. Try again.');}if(!response.ok)throw new Error('OpenRouter connection failed ('+response.status+'). Reconnect or try again later.');const text=await response.text();assert('OpenRouter response is too large.',text.length<5000000);return JSON.parse(text);}
export function freeModels(data){return (Array.isArray(data?.data)?data.data:[]).filter(m=>typeof m.id==='string'&&m.id.endsWith(':free')&&m.id.length<160&&typeof m.hugging_face_id==='string'&&m.hugging_face_id.includes('/')&&m.pricing&&['prompt','completion'].every(k=>m.pricing[k]!==undefined&&m.pricing[k]!==null&&m.pricing[k]!==''&&Number(m.pricing[k])===0)&&Object.values(m.pricing).every(v=>(typeof v==='string'||typeof v==='number')&&v!==''&&Number(v)===0)&&m.architecture?.output_modalities?.includes('text')&&Number.isSafeInteger(m.context_length)&&m.context_length>=32768).map(m=>({id:m.id,name:String(m.name||m.id).slice(0,160),context_length:m.context_length,structured:m.supported_parameters?.includes('structured_outputs')===true})).sort((a,b)=>Number(b.structured)-Number(a.structured)||a.name.localeCompare(b.name));}
let cached=null;
export async function catalog(){if(cached&&Date.now()-cached.at<60000)return cached.models;const models=freeModels(await remote('models'));cached={at:Date.now(),models};return models;}
export async function openrouterStatus(storage){return {connected:!!await storage.get('openrouter-key')};}
export async function openrouterRoute(request,storage){const url=new URL(request.url),p=url.pathname;if(!p.startsWith('/api/account/openrouter/'))return null;const method=request.method;
 if(p.endsWith('/models')&&method==='GET')return json({models:await catalog()});
 if(p.endsWith('/pending')&&method==='GET'){const pending=await storage.get('openrouter-pkce');return json({state:pending?.expires>Date.now()?pending.state:null});}
 if(method!=='POST')return null;
 if(p.endsWith('/start')){
  // A stale tab must not replace a durable connection with another authorization flow.
  if((await openrouterStatus(storage)).connected)return json({connected:true});
  const d=await request.json();let draft=null;
  if(d.draft){
   const v=d.draft;assert('Invalid chat draft.',typeof v.task==='string'&&v.task.length<=80000&&typeof v.drive_query==='string'&&v.drive_query.length<=4000&&['auto','chatgpt','claude'].includes(v.provider)&&['chatgpt','claude'].includes(v.drive_provider)&&typeof v.resume==='boolean');
   const {source}=normalizeInput({brief:v.task||'Draft',context:v.context});
   if(v.parent_id)assert('Conversation not found.',typeof v.parent_id==='string'&&/^[a-zA-Z0-9-]+$/.test(v.parent_id)&&!!await storage.get('run:'+v.parent_id));
   draft={task:v.task,context:source.context,parent_id:v.parent_id||null,provider:v.provider,drive_query:v.drive_query,drive_provider:v.drive_provider,resume:v.resume&&!!v.task.trim()};
  }
  const verifier=randomBytes(32).toString('base64url'),state=randomBytes(24).toString('hex');
  await storage.put('openrouter-pkce',{verifier,state,expires:Date.now()+600000,draft_expires:Date.now()+86400000,draft});
  const callback=new URL('/',url.origin);callback.searchParams.set('or_state',state);
  const auth=new URL('https://openrouter.ai/auth');auth.searchParams.set('callback_url',callback.href);auth.searchParams.set('code_challenge',hash(verifier).toString('base64url'));auth.searchParams.set('code_challenge_method','S256');
  return json({url:auth.href,state});
 }
 if(p.endsWith('/restore')){
  const d=await request.json(),pending=await storage.get('openrouter-pkce');
  if(!pending||typeof d.state!=='string'||d.state!==pending.state)return json({draft:null});
  const draft=pending.draft_expires>Date.now()?pending.draft:null;
  // Claim auto-resume once, but retain the bounded draft for retry after a lost response.
  // A cancelled sign-in or repeat restore cannot automatically send this message.
  await storage.put('openrouter-pkce',{...pending,resume_claimed:true,...(!draft?{draft:null}:{})});
  return json({draft,connected:pending.connected===true,auto_resume:pending.connected===true&&!pending.resume_claimed});
 }
 if(p.endsWith('/finish')){
  const d=await request.json(),pending=await storage.get('openrouter-pkce');
  const codeHash=typeof d.code==='string'?hash(d.code).toString('hex'):null;
  if(pending?.connected&&pending.state===d.state&&codeHash&&pending.code_hash===codeHash&&(await openrouterStatus(storage)).connected)return json({connected:true});
  assert('OpenRouter connection expired. Please try again.',pending&&pending.expires>Date.now()&&!pending.consumed&&typeof d.state==='string'&&d.state===pending.state&&typeof d.code==='string'&&d.code.length>0&&d.code.length<2000);
  await storage.put('openrouter-pkce',{...pending,consumed:true,code_hash:codeHash});
  const result=await remote('auth/keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:d.code,code_verifier:pending.verifier,code_challenge_method:'S256'})});
  assert('OpenRouter returned no valid key.',typeof result.key==='string'&&result.key.startsWith('sk-or-')&&result.key.length<1024);
  await storage.put('openrouter-key',seal(result.key,storage.tenant));
  // Preserve a restore that happened while the provider exchange was in flight.
  const latest=await storage.get('openrouter-pkce');
  if(latest?.state===pending.state)await storage.put('openrouter-pkce',{...latest,connected:true});
  return json({connected:true});
 }
 if(p.endsWith('/disconnect')){await storage.put('openrouter-key',null);await storage.put('openrouter-pkce',null);const selection=await storage.get('local-model');if(selection?.server==='openrouter')await storage.put('local-model',null);return json({connected:false});}
 if(p.endsWith('/select')){const d=await request.json();assert('Connect OpenRouter first.',!!await storage.get('openrouter-key'));assert('Select an available free model.',(await catalog()).some(m=>m.id===d.model));await storage.put('local-model',{server:'openrouter',model:d.model});return json({ok:true});}
 return null;
}
export async function openrouterCredential(request,storage){const d=await request.json(),r=typeof d.id==='string'?await storage.get('run:'+d.id):null;assert('Invalid active task claim.',r&&typeof d.claim==='string'&&r.claim===d.claim&&r.report.status==='running'&&r.config.body.backend==='openrouter'&&!await storage.get('bridge-disabled'));const value=await storage.get('openrouter-key');assert('Reconnect OpenRouter in Models.',!!value);return json({key:unseal(value,storage.tenant)});}
