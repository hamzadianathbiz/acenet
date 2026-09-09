import {put,get} from '@vercel/blob';
const options={access:'private',addRandomSuffix:false,allowOverwrite:true};
async function read(path){const r=await get(path,{access:'private',useCache:false});return r?{value:await new Response(r.stream).json(),etag:r.blob.etag}:null;}
export async function acquire(tenant=''){const path=tenant?'tenants/'+tenant+'/lock.json':'lock.json';const current=await read(path);if(current?.value.until>Date.now())return null;const id=crypto.randomUUID();try{await put(path,JSON.stringify({id,until:Date.now()+230000}),{...options,allowOverwrite:!!current,...(current?{ifMatch:current.etag}:{})});}catch(e){if(e.name.includes('Precondition')||e.name.includes('AlreadyExists'))return null;throw e;}return async()=>{const latest=await read(path);if(latest?.value.id===id)await put(path,JSON.stringify({id,until:0}),{...options,ifMatch:latest.etag});};}
export class Storage{
 constructor(tenant=''){if(tenant&&!/^[a-zA-Z0-9-]+$/.test(tenant))throw new Error('Invalid tenant');this.prefix=tenant?'tenants/'+tenant+'/state/':'state/';}
 async get(k){const v=(await read(this.prefix+k.replace(/:/g,'--')+'.json'))?.value;if(v&&k.startsWith('run:')&&(await read(this.prefix+'cancel--'+v.id+'.json'))?.value){v.report.status='cancelled';v.report.error='Stopped. An in-flight provider call may still be billed.';}return v;}
 async put(k,v){await put(this.prefix+k.replace(/:/g,'--')+'.json',JSON.stringify(v),options);if(k.startsWith('run:')){const index=await this.get('index')||[];const summary={id:v.id,title:v.title,created:v.created,mode:v.mode,report:v.report};await this.put('index',[summary,...index.filter(x=>x.id!==v.id)].slice(0,100));}}
 async list(){const rows=await this.get('index')||[];return new Map(rows.map(r=>[r.id,r]));}
 async transaction(fn){return fn(this);} async setAlarm(){} async deleteAlarm(){}
}
