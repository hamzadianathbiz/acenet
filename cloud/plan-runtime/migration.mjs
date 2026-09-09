import {createHash,timingSafeEqual} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest('hex');
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function migrationRoute(request,raw,env){
 if(new URL(request.url).pathname!=='/api/migration/import')return null;
 if(!env.MIGRATION_TOKEN)return json({error:'Not found'},404);
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!timingSafeEqual(Buffer.from(digest(token)),Buffer.from(digest(env.MIGRATION_TOKEN))))return json({error:'Migration authentication required'},401);
 if(request.method!=='POST'||request.headers.has('origin'))return json({error:'Use the private migration command'},403);
 const text=await request.text();if(Buffer.byteLength(text)>8000000)return json({error:'Snapshot exceeds migration limit'},413);
 let data;try{data=JSON.parse(text);}catch{return json({error:'Invalid snapshot JSON'},400);}
 if(data.version!==1||!['fresh','snapshot'].includes(data.mode)||!Array.isArray(data.records)||data.records.length>1000||!(/^[a-f0-9]{64}$/).test(data.sha256||''))return json({error:'Invalid snapshot'},400);
 if(data.mode==='fresh'&&data.records.length!==0||data.mode==='snapshot'&&data.records.length===0)return json({error:'Invalid snapshot mode'},400);
 const seen=new Set();
 for(const row of data.records){
  if(!row||typeof row.path!=='string'||!(/^(?:state\/|tenants\/[a-zA-Z0-9-]+\/state\/)[a-zA-Z0-9._-]+\.json$/).test(row.path)||seen.has(row.path)||row.value===undefined)return json({error:'Invalid or duplicate record path'},400);
  if(Buffer.byteLength(row.path)+Buffer.byteLength(JSON.stringify(row.value))>1900000)return json({error:'Record exceeds storage limit'},413);
  seen.add(row.path);
 }
 if(digest(JSON.stringify(data.records))!==data.sha256)return json({error:'Snapshot checksum mismatch'},400);
 const previous=await raw.get('migration:complete');
 if(previous)return previous.sha256===data.sha256&&previous.mode===data.mode?json({ok:true,already_initialized:true,count:previous.count}):json({error:'Workspace is already initialized; existing records cannot be replaced'},409);
 if((await raw.list({limit:1})).size)return json({error:'Destination is not empty'},409);
 const marker={version:1,mode:data.mode,count:data.records.length,sha256:data.sha256,initialized_at:new Date().toISOString()};
 await raw.transaction(async tx=>{for(const row of data.records)await tx.put(row.path,row.value);await tx.put('migration:complete',marker);});
 return json({ok:true,count:marker.count,sha256:marker.sha256});
}
