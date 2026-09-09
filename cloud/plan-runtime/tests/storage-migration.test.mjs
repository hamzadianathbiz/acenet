import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Storage} from '../storage.mjs';
import {migrationRoute} from '../migration.mjs';
class Raw{
 constructor(map=new Map()){this.map=map;}
 async get(k){return structuredClone(this.map.get(k));}
 async put(k,v){this.map.set(k,structuredClone(v));}
 async list(){return new Map(this.map);}
 async transaction(fn){const tx=new Raw(new Map(this.map));const result=await fn(tx);this.map=tx.map;return result;}
}
const env={MIGRATION_TOKEN:'fixture-migration-token'};
function snapshot(records=[],mode='fresh'){return {version:1,mode,records,sha256:createHash('sha256').update(JSON.stringify(records)).digest('hex')};}
function request(data,token=env.MIGRATION_TOKEN){return new Request('https://app.test/api/migration/import',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(data)});}
test('tenant paths, summaries and cancellation remain isolated without Blob locks',async()=>{
 const raw=new Raw(),alice=new Storage(raw,'alice'),bob=new Storage(raw,'bob');
 const run={id:'run-1',title:'Task',created:'today',mode:'mixed',report:{status:'running'}};
 await alice.put('run:run-1',run);await bob.put('run:run-1',run);await alice.put('cancel:run-1',true);
 assert.equal((await alice.get('run:run-1')).report.status,'cancelled');assert.equal((await bob.get('run:run-1')).report.status,'running');
 assert(raw.map.has('tenants/alice/state/run--run-1.json'));assert.equal((await alice.list()).size,1);
 assert(![...raw.map.keys()].some(k=>k.includes('lock')));
 await assert.rejects(()=>alice.put('run:huge',{...run,id:'huge',content:'漢'.repeat(650000)}),/storage limit/);
 assert.equal((await alice.list()).size,1);assert.equal(await alice.get('run:huge'),undefined);
 assert.throws(()=>new Storage(raw,'../owner'),/Invalid tenant/);
});
test('migration is authenticated, checksummed, single-use and non-destructive',async()=>{
 const raw=new Raw();assert.equal((await migrationRoute(request(snapshot(),'wrong'),raw,env)).status,401);
 const records=[{path:'tenants/auth/state/user--hash.json',value:{tenant:'kept-uuid',salt:'kept-salt',password:'kept-hash'}}];const data=snapshot(records,'snapshot');
 assert.equal((await migrationRoute(request({...data,sha256:'a'.repeat(64)}),raw,env)).status,400);
 assert.equal(raw.map.size,0);assert.equal((await migrationRoute(request(data),raw,env)).status,200);
 assert.deepEqual(await raw.get(records[0].path),records[0].value);assert.equal((await migrationRoute(request(data),raw,env)).status,200);
 assert.equal((await migrationRoute(request(snapshot()),raw,env)).status,409);assert.deepEqual(await raw.get(records[0].path),records[0].value);
});
test('fresh initialization is explicit; invalid and conflicting imports cannot overwrite state',async()=>{
 const raw=new Raw();assert.equal((await migrationRoute(request(snapshot()),raw,env)).status,200);assert.equal((await raw.get('migration:complete')).mode,'fresh');
 for(const records of [[{path:'../secret',value:1}],[{path:'state/x.json',value:1},{path:'state/x.json',value:2}]])assert.equal((await migrationRoute(request(snapshot(records,'snapshot')),new Raw(),env)).status,400);
 const dirty=new Raw();await dirty.put('state/existing.json',{keep:true});assert.equal((await migrationRoute(request(snapshot()),dirty,env)).status,409);assert.deepEqual(await dirty.get('state/existing.json'),{keep:true});
});
