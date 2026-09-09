import {cp,writeFile} from 'node:fs/promises';
await import('./prepare-plan.mjs');
const out=new URL('../pages-public/',import.meta.url);
await cp(new URL('../plan-public/',import.meta.url),out,{recursive:true});
await writeFile(new URL('_routes.json',out),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
await writeFile(new URL('_worker.js',out),`export default {fetch(request,env){if(new URL(request.url).pathname.startsWith('/api/'))return env.COORDINATOR.get(env.COORDINATOR.idFromName('acenet-v1')).fetch(request);return env.ASSETS.fetch(request);}};\n`);
console.log('Pages frontend prepared with direct private Durable Object binding.');
