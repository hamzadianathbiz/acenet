import {planRoute,bridgeRoute} from '../lib/plan.mjs';
import {Workspace} from '../lib/worker.generated.mjs';
import {Storage,acquire} from '../lib/storage.mjs';
import {identity,authRoute,connectorTenant,connectorToken} from '../lib/auth.mjs';
import {issuePairing,redeemPairing} from '../lib/pairing.mjs';
import {publicError} from '../lib/errors.mjs';
export default async function handler(req,res){
 res.statusCode=410;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('Retry-After','900');
 res.end(JSON.stringify({error:'ACENET moved to https://ace-acenet.pages.dev. Create your account there and reconnect with the new helper. Previous storage is preserved.',app:'https://ace-acenet.pages.dev'}));
}
// Preserved legacy implementation for recovery; no production request reaches Blob.
async function legacyHandler(req,res){let release;
 const send=async response=>{const data=Buffer.from(await response.arrayBuffer());if(release){const unlock=release;release=null;await unlock();}res.statusCode=response.status;for(const [k,v]of response.headers)res.setHeader(k,v);res.end(data);};
 const fail=(message,status)=>send(Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}}));
 try {
 const origin='https://'+req.headers.host,url=new URL(req.url,origin);if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Private storage is not connected.');
 if(!['GET','POST'].includes(req.method))return await fail('Method not allowed',405);
 if(JSON.stringify(req.body||{}).length>2000000)return await fail('Request too large',413);
 const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
 const request=new Request(url,{method:req.method,headers,...(req.method==='POST'?{body:JSON.stringify(req.body||{})}:{})});
 if(url.pathname==='/api/pair/redeem'){if(req.method!=='POST')return await fail('Method not allowed',405);release=await acquire('pairing');if(!release)return await fail('Pairing service busy. Try again shortly.',409);const trustedIp=headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||'unknown';return await send(await redeemPairing(new Storage('pairing'),req.body?.code,trustedIp));}
 if(url.pathname.startsWith('/api/bridge/')){const tenant=connectorTenant(headers.get('authorization')?.replace(/^Bearer /,''));if(req.method!=='POST'||tenant===null)return await fail('Connector authentication required.',401);release=await acquire(tenant);if(!release)return await fail('Workspace busy',409);return await send(await bridgeRoute(request,new Storage(tenant)));}
 if(req.method==='POST'&&headers.get('origin')!==origin)return await fail('Origin not allowed',403);
 const db=new Storage('auth'),user=await identity(request,db),isLogin=['/api/auth/register','/api/auth/login','/api/setup'].includes(url.pathname);
 if(req.method==='POST'&&!isLogin&&(!user||headers.get('X-ACENET-Token')!==user.csrf))return await fail('Sign in first',401);
 if((isLogin||url.pathname==='/api/auth/logout')&&req.method!=='POST')return await fail('Method not allowed',405);
 if(isLogin||url.pathname==='/api/auth/logout'){release=await acquire('auth');if(!release)return await fail('Account service busy. Try again shortly.',409);}
 const auth=await authRoute(request,db,user,headers.get('x-vercel-forwarded-for')||headers.get('x-forwarded-for')||'unknown');if(auth)return await send(auth);
 if(!user)return await fail('Sign in to your ACENET account.',401);
 if(url.pathname==='/api/account/pairing'){if(req.method!=='POST')return await fail('Method not allowed',405);release=await acquire('pairing');if(!release)return await fail('Pairing service busy. Try again shortly.',409);return await send(await issuePairing(new Storage('pairing'),user));}
 const storage=new Storage(user.tenant),ws=new Workspace({storage},{STORAGE_KEY:process.env.STORAGE_KEY});
 const stop=url.pathname.match(/^\/api\/runs\/([a-zA-Z0-9-]+)\/cancel$/);
 if(req.method==='POST'&&stop){if(!await storage.get('run:'+stop[1]))return await fail('Run not found',404);await storage.put('cancel:'+stop[1],true);return await send(Response.json({ok:true}));}
 if(req.method==='POST'){release=await acquire(user.tenant);if(!release)return await fail('Workspace busy. Try again shortly.',409);}
 if(url.pathname==='/api/account/connector-config'&&req.method==='GET')return await send(new Response(JSON.stringify({app:origin,token:user.tenant?connectorToken(user.tenant):process.env.BRIDGE_TOKEN,id:'runner-'+crypto.randomUUID()}),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="config.json"','Cache-Control':'no-store'}}));
 const planned=await planRoute(request,storage,ws);if(planned)return await send(planned);
 // Only the read-only result routes reach the legacy worker. Hosted API execution stays disabled.
 if(req.method!=='GET'||!/^\/api\/runs(?:\/[a-zA-Z0-9-]+(?:\/download)?)?$/.test(url.pathname))return await fail('Not found',404);
 headers.set('X-Workspace-Authenticated',user.csrf);return await send(await ws.fetch(new Request(request,{headers})));
 }catch(e){if(release){const unlock=release;release=null;try{await unlock();}catch{ /* The lease expires if storage is unavailable. */ }}const out=publicError(e);if(out.retryAfter)res.setHeader('Retry-After',String(out.retryAfter));return await fail(out.message,out.status);}finally{if(release)await release();}}
