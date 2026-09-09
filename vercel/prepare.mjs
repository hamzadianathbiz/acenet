import {execFileSync} from 'node:child_process';
import {readFile,writeFile,cp} from 'node:fs/promises';
for(const f of ['core.mjs','schemas.mjs'])await cp('../cloud/src/'+f,'lib/'+f);
let source=await readFile('../cloud/src/index.js','utf8');source=source.replace("import {DurableObject} from 'cloudflare:workers';",'class DurableObject {}').replace("import {assets} from './assets.generated.mjs';",'const assets={};').replace("cloud:true,locked:","cloud:true,host:'vercel',locked:").replace("['api_key','body_key']","['api_key','body_key','cloudflare_token','cloudflare_account']");
source=source.replace("models=candidateModels(d.config);const id", "models=candidateModels(d.config).filter(m=>m.backend!=='workers_ai'||Boolean(this.env.CLOUDFLARE_AVAILABLE));assert('Connect Cloudflare Workers AI in Connections or choose Luna.',models.length);const id");
source=source.replace("if(path==='/api/runs'&&request.method==='POST')", "if(path==='/api/tick'&&request.method==='POST'){await this.alarm();return json({ok:true});}\n if(path==='/api/runs'&&request.method==='POST')");
await writeFile('lib/worker.generated.mjs',source);
for(const f of ['index.html','app.js','styles.css','ace-tokens.css','assets'])await cp('../app/public/'+f,'public/'+f,{recursive:true});
let html=await readFile('public/index.html','utf8');html=html.replace('<label class="field-label" for="body-key">','<details><summary>Cloudflare Workers AI (optional)</summary><label class="field-label" for="cloudflare-account">Cloudflare account ID</label><input id="cloudflare-account" autocomplete="off"><label class="field-label" for="cloudflare-token">Workers AI API token</label><input id="cloudflare-token" type="password" autocomplete="off"><p class="small muted">Enables Qwen in automatic routing. Needs Workers AI Run access.</p></details><label class="field-label" for="body-key">');await writeFile('public/index.html',html);
let js=await readFile('public/app.js','utf8');js=js.replace("state.cloud=Boolean(boot.cloud);", "state.cloud=Boolean(boot.cloud);state.vercel=boot.host==='vercel';").replace("body_key:$('body-key').value.trim()", "body_key:$('body-key').value.trim(),cloudflare_token:$('cloudflare-token')?.value.trim(),cloudflare_account:$('cloudflare-account')?.value.trim()").replace("'Cloudflare connected':'Local connection'", "(state.vercel?'Vercel connected':'Cloudflare connected'):'Local connection'").replace("'Cloudflare runtime · API connections only'", "'Hosted runtime · API connections only'");
js=js.replace("state.connected=true;}","state.connected=true;if(state.vercel&&state.runs.some(r=>!terminal.has(r.report.status))&&!state.ticking){state.ticking=true;api('/api/tick',{}).catch(e=>toast(e.message)).finally(()=>state.ticking=false);}}");
js=js.replace("'Cloud keys are encrypted in the private workspace. Localhost endpoints are not reachable from Cloudflare.'", "'Keys are encrypted in private storage. Keep this tab open to advance tasks; refresh to resume. Localhost model servers require the local app.'").replace("Astra specifies eligible models. The lowest estimated cost wins for each step.","Astra specifies eligible models. The lowest estimate wins. Connect Cloudflare to add Qwen; otherwise Luna is used.");await writeFile('public/app.js',js);

// The production app defaults exclusively to ChatGPT-plan execution.
await cp("../app/public/account.html","public/index.html");
await cp("../app/public/account.js","public/account.js");
await cp("../app/public/cost-comparison.js","public/cost-comparison.js");
await cp("../app/public/account.css","public/account.css");

execFileSync("python3",["../connector/package.py"]);
