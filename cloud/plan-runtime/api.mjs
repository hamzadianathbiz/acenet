import {identity,authRoute,connectorTenant,connectorToken} from '../../vercel/lib/auth.mjs';
import {issuePairing,redeemPairing} from '../../vercel/lib/pairing.mjs';
import {planRoute,bridgeRoute} from '../../vercel/lib/plan.mjs';
import {Workspace} from '../../vercel/lib/worker.generated.mjs';
import {Storage} from './storage.mjs';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function handleApi(request,raw,env,migrate=async()=>null){
 try{
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(path==='/api/health'&&method==='GET')return json({ok:true,ready:!!await raw.get('migration:complete'),host:'cloudflare'});
  const migration=await migrate(request,raw,env);if(migration)return migration;
  if(!await raw.get('migration:complete'))return json({error:'The new workspace is being prepared. Please try again shortly.'},503);
  if(!['GET','POST'].includes(method))return json({error:'Method not allowed'},405);
  if(method==='POST'){
   const data=await request.arrayBuffer();if(data.byteLength>1900000)return json({error:'Request too large'},413);
   request=new Request(request,{body:data});
  }
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(path==='/api/pair/redeem'){
   if(method!=='POST')return json({error:'Method not allowed'},405);
   return await redeemPairing(new Storage(raw,'pairing'),(await request.json()).code,ip);
  }
  if(path.startsWith('/api/bridge/')){
   const tenant=connectorTenant(request.headers.get('authorization')?.replace(/^Bearer /,''));
   if(method!=='POST'||tenant===null)return json({error:'Connector authentication required.'},401);
   return await bridgeRoute(request,new Storage(raw,tenant));
  }
  if(method==='POST'&&request.headers.get('origin')!==url.origin)return json({error:'Origin not allowed'},403);
  const db=new Storage(raw,'auth'),user=await identity(request,db),isLogin=['/api/auth/register','/api/auth/login','/api/setup'].includes(path);
  if(method==='POST'&&!isLogin&&(!user||request.headers.get('X-ACENET-Token')!==user.csrf))return json({error:'Sign in first'},401);
  if((isLogin||path==='/api/auth/logout')&&method!=='POST')return json({error:'Method not allowed'},405);
  const auth=await authRoute(request,db,user,ip);if(auth)return path==='/api/bootstrap'?json({...await auth.json(),state_poll:true}):auth;
  if(!user)return json({error:'Sign in to your ACENET account.'},401);
  if(path==='/api/account/pairing')return method==='POST'?await issuePairing(new Storage(raw,'pairing'),user):json({error:'Method not allowed'},405);
  const storage=new Storage(raw,user.tenant),ws=new Workspace({storage},{STORAGE_KEY:env.STORAGE_KEY});
  if(path==='/api/state'&&method==='GET'){
   const account=await (await planRoute(new Request(new URL('/api/account',url)),storage,ws)).json();
   const runs=[...(await storage.list()).values()];
   const selected=url.searchParams.get('selected');let detail=null;
   if(selected&&/^[a-zA-Z0-9-]+$/.test(selected)){const run=await storage.get('run:'+selected);if(run){detail=ws.public(run);if(run.baseline_id){const baseline=await storage.get('run:'+run.baseline_id);if(baseline)detail.comparison_baseline={report:baseline.report,ledger:baseline.ledger};}}}
   return json({account,runs,detail});
  }
  const stop=path.match(/^\/api\/runs\/([a-zA-Z0-9-]+)\/cancel$/);
  if(method==='POST'&&stop){if(!await storage.get('run:'+stop[1]))return json({error:'Run not found'},404);await storage.put('cancel:'+stop[1],true);return json({ok:true});}
  if(path==='/api/account/connector-config'&&method==='GET')return new Response(JSON.stringify({app:env.ACENET_PUBLIC_ORIGIN,token:user.tenant?connectorToken(user.tenant):env.BRIDGE_TOKEN,id:'runner-'+crypto.randomUUID()}),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="config.json"','Cache-Control':'no-store'}});
  if(method==='GET'&&/^\/api\/runs\/[a-zA-Z0-9-]+$/.test(path)){const run=await storage.get('run:'+path.split('/')[3]);if(run){const detail=ws.public(run);if(run.baseline_id){const baseline=await storage.get('run:'+run.baseline_id);if(baseline)detail.comparison_baseline={report:baseline.report,ledger:baseline.ledger};}return json(detail);}}
  const planned=await planRoute(request,storage,ws);if(planned)return planned;
  if(method!=='GET'||!/^\/api\/runs(?:\/[a-zA-Z0-9-]+(?:\/download)?)?$/.test(path))return json({error:'Not found'},404);
  const headers=new Headers(request.headers);headers.set('X-Workspace-Authenticated',user.csrf);return await ws.fetch(new Request(request,{headers}));
 }catch(error){return json({error:error.message||'Request failed'},400);}
}
