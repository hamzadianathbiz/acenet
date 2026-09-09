const limit=1900000;
export class Storage{
 constructor(raw,tenant=''){
  if(tenant&&!/^[a-zA-Z0-9-]+$/.test(tenant))throw new Error('Invalid tenant');
  this.raw=raw;this.tenant=tenant;this.prefix=tenant?'tenants/'+tenant+'/state/':'state/';
 }
 path(key){if(typeof key!=='string'||!/^[a-zA-Z0-9:._-]+$/.test(key))throw new Error('Invalid storage key');return this.prefix+key.replace(/:/g,'--')+'.json';}
 checked(key,value){const path=this.path(key);if(new TextEncoder().encode(path+JSON.stringify(value)).byteLength>limit)throw new Error('This record exceeds the workspace storage limit. Reduce the task or attached context.');return path;}
 async get(key){const value=await this.raw.get(this.path(key));if(value&&key.startsWith('run:')&&await this.raw.get(this.path('cancel:'+value.id))){value.report.status='cancelled';value.report.error='Stopped. An in-flight provider call may still be billed.';}return value;}
 async put(key,value){
  const path=this.checked(key,value);
  if(!key.startsWith('run:')){await this.raw.put(path,value);return;}
  await this.raw.transaction(async tx=>{
   const old=await tx.get(this.path('index'))||[],summary={id:value.id,title:value.title,created:value.created,mode:value.mode,report:value.report};
   const index=[summary,...old.filter(row=>row.id!==value.id)].slice(0,100);const indexPath=this.checked('index',index);
   await tx.put(path,value);await tx.put(indexPath,index);
  });
 }
 async list(){return new Map((await this.get('index')||[]).map(row=>[row.id,row]));}
 async transaction(fn){return this.raw.transaction(tx=>fn(new Storage(tx,this.tenant)));}
 async setAlarm(){} async deleteAlarm(){}
}
