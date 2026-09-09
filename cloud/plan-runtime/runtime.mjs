import {DurableObject} from 'cloudflare:workers';
import {handleApi} from './api.mjs';
import {migrationRoute} from './migration.mjs';
export class Coordinator extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;for(const key of ['STORAGE_KEY','APP_PASSWORD','BRIDGE_TOKEN','ACENET_PUBLIC_ORIGIN'])if(env[key])process.env[key]=env[key];}
 async fetch(request){return this.ctx.blockConcurrencyWhile(async()=>{
  try{return await handleApi(request,this.ctx.storage,this.env,migrationRoute);}catch{return Response.json({error:'Workspace temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'15'}});}
 });}
}
export default{
 fetch(request,env){
  if(new URL(request.url).pathname.startsWith('/api/'))return env.COORDINATOR.get(env.COORDINATOR.idFromName('acenet-v1')).fetch(request);
  return env.ASSETS.fetch(request);
 }
};
