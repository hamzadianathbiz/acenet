import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
if(!process.argv.includes('--fresh'))throw new Error('Pass --fresh only after the owner explicitly approves a fresh workspace.');
const config=JSON.parse(await readFile(new URL('../wrangler.plan.jsonc',import.meta.url),'utf8'));
const secrets=JSON.parse(await readFile(new URL('../.plan-secrets.json',import.meta.url),'utf8'));
const base=config.vars.ACENET_PUBLIC_ORIGIN;
const response=await fetch(base+'/api/migration/import',{method:'POST',headers:{Authorization:'Bearer '+secrets.MIGRATION_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({version:1,mode:'fresh',records:[],sha256:createHash('sha256').update('[]').digest('hex')}),signal:AbortSignal.timeout(30000)});
const result=await response.json();if(!response.ok)throw new Error(result.error||'Initialization failed');
console.log(JSON.stringify({origin:base,initialized:result.ok,records:result.count,already_initialized:!!result.already_initialized}));
