'use strict';
const $ = id => document.getElementById(id);
const state = {token: '', runs: [], selected: null, detail: null, tab: 'output', files: [], defaults: null, loading: false, signature: '', connected: false};
const statuses = {accepted_by_astra:'Accepted by Astra',baseline_complete:'Baseline complete',needs_human_review:'Needs review',failed:'Failed',cancelled:'Stopped',interrupted:'Interrupted',running:'Running',queued:'Starting'};
const terminal = new Set(['accepted_by_astra','baseline_complete','needs_human_review','failed','cancelled','interrupted']);
const labels = {plan:'Plan',execute:'Execute',assemble:'Assemble / repair',review:'Review',baseline:'Astra baseline'};
const preferencesKey = 'acenet.preferences.v1';
const money = value => value == null ? 'Unknown' : '$' + Number(value).toFixed(4);
const count = value => Number(value).toLocaleString();
function el(tag, className, text) {const node = document.createElement(tag); if(className)node.className=className;if(text!=null)node.textContent=text;return node;}
function showError(text) {$('form-error').textContent=text;$('form-error').hidden=!text;}
function toast(text) {$('toast').textContent=text;$('toast').hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{$('toast').hidden=true;},4500);}
async function api(path, body) {
 const options = body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json','X-ACENET-Token':state.token},body:JSON.stringify(body)};
 const response = await fetch(path,options);
 const data = await response.json();
 if(!response.ok)throw new Error(data.error || 'Request failed');
 return data;
}
function statusClass(status) {return ['accepted_by_astra','baseline_complete'].includes(status)?'good':terminal.has(status)?'warn':'';}
function nodeDot(status){return el('i','status-dot '+(statusClass(status)==='warn'?'warn':terminal.has(status)?'':'live'));}
function when(value){const d=new Date(value);return Number.isNaN(d.valueOf())?'':d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});}
function renderHistory(){
 const root=$('history');root.replaceChildren();$('history-count').textContent=state.runs.length.toString().padStart(2,'0');
 if(!state.runs.length){root.append(el('p','muted small','Your runs will appear here. Start with a brief.'));return;}
 for(const run of state.runs){
  const button=el('button','history-item'+(state.selected===run.id?' selected':''));button.type='button';button.setAttribute('aria-label','Open run: '+run.title);
  button.append(el('span','history-title',run.title));const meta=el('span','history-meta');meta.append(nodeDot(run.report.status),el('span','',when(run.created)));button.append(meta);button.title=statuses[run.report.status]||'Unknown';button.onclick=()=>openRun(run.id);root.append(button);
 }
}
function renderProvider(){
 const provider=$('body-provider').value;
 $('endpoint-fields').hidden=['auto','luna','qwen'].includes(provider);$('body-symbol').textContent=provider==='auto'?'↳':provider==='luna'?'L':'O';
 const descriptions={auto:'Astra specifies eligible models. The lowest estimated cost wins for each step.',qwen:'Open-weight Qwen, hosted on Cloudflare Workers AI.',luna:'Fast, cost-sensitive execution through your '+($('brain-backend').value==='codex'?'Codex login.':'OpenAI API connection.'),ollama:'Run an installed open model on your machine.',lmstudio:'Use a model served by LM Studio on your machine.',custom:'Connect any server with compatible JSON chat completions.'};
 $('body-description').textContent=descriptions[provider];$('route-label').textContent=provider==='auto'?'Automatic routing':provider==='luna'?'Astra + Luna':'Astra + open model';
 const required=!['auto','luna','qwen'].includes(provider);$('body-url').required=required;$('body-model').required=required;
}
function providerChanged(){
 const p=$('body-provider').value;
 if(p==='ollama')$('body-url').value='http://localhost:11434/v1';
 if(p==='lmstudio')$('body-url').value='http://localhost:1234/v1';
 if(p==='custom')$('body-url').value='';
 $('body-model').value='';$('model-list').replaceChildren();$('discovery-status').textContent='Discover available models or enter the exact model ID.';
 renderProvider();savePreferences();
}
function credentials(){const brain=$('brain-key').value.trim();return {brain,body:['auto','luna'].includes($('body-provider').value)?brain:$('body-key').value.trim()};}
function getConfig(){
 const c=structuredClone(state.defaults);const backend=$('brain-backend').value;
 c.brain.backend=backend;c.brain.base_url='https://api.openai.com/v1';
 c.brain.rates=$('use-prices').checked?state.defaults.brain.rates:null;
 c.routing=$('body-provider').value==='auto'?'auto':'manual';
 if(['auto','luna'].includes($('body-provider').value)){
  c.body.backend=backend;c.body.base_url='https://api.openai.com/v1';c.body.rates=$('use-prices').checked?state.defaults.body.rates:null;
 }else if($('body-provider').value==='qwen'){ c.body={backend:'workers_ai',model:'@cf/qwen/qwen3-30b-a3b-fp8',rates:{input:.051,cached_input:.051,output:.34}};
 }else{
  c.body={backend:'chat',model:$('body-model').value.trim(),base_url:$('body-url').value.trim(),effort:'medium',rates:null};
  const values=[$('price-input').value,$('price-cached').value,$('price-output').value];
  if($('use-prices').checked&&values.every(v=>v!=='')) c.body.rates={input:Number(values[0]),cached_input:Number(values[1]),output:Number(values[2])};
 }
 c.max_calls=Number($('max-calls').value);c.max_repairs=Number($('max-repairs').value);
 return c;
}
function savePreferences(){
 const data={provider:$('body-provider').value,url:$('body-url').value,model:$('body-model').value,brain:$('brain-backend').value,prices:[$('price-input').value,$('price-cached').value,$('price-output').value],estimate:$('use-prices').checked,repairs:$('max-repairs').value,calls:$('max-calls').value};
 try{localStorage.setItem(preferencesKey,JSON.stringify(data));}catch{}
}
function loadPreferences(){
 try{
  const p=JSON.parse(localStorage.getItem(preferencesKey)||'null');if(!p)return;
  if(['auto','luna','ollama','lmstudio','custom','qwen'].includes(p.provider))$('body-provider').value=p.provider;
  $('body-url').value=p.url||'';$('body-model').value=p.model||'';
  if(['codex','responses'].includes(p.brain))$('brain-backend').value=p.brain;
  if(p.prices)[$('price-input'),$('price-cached'),$('price-output')].forEach((n,i)=>n.value=p.prices[i]||'');
  $('use-prices').checked=p.estimate!==false;$('max-repairs').value=p.repairs||'1';$('max-calls').value=p.calls||'12';
 }catch{}
}
function newRun(){
 state.selected=null;state.detail=null;state.signature='';$('compose-view').hidden=false;$('detail-view').hidden=true;$('breadcrumb').textContent='New run';
 window.history.replaceState(null,'',location.pathname);renderHistory();showError('');window.scrollTo({top:0});
}
async function openRun(id){
 try{
  const detail=await api('/api/runs/'+encodeURIComponent(id));
  state.selected=id;state.detail=detail;state.signature='';state.tab='output';window.history.replaceState(null,'','#run='+encodeURIComponent(id));
  $('compose-view').hidden=true;$('detail-view').hidden=false;$('breadcrumb').textContent='Run inspector';renderHistory();renderDetail();
 }catch(e){toast(e.message);}
}
function stageState(roles){const calls=state.detail.ledger.filter(c=>roles.includes(c.role));if(calls.some(c=>c.status==='started')&&!terminal.has(state.detail.report.status))return'active';return calls.length&&calls.every(c=>c.status==='completed')?'done':'';}
function renderDetail(){
 const d=state.detail;if(!d)return;
 $('run-id').textContent=d.id.replace(/^web-/,'')+' / '+when(d.created);$('run-title').textContent=d.title;
 $('run-status').textContent=statuses[d.report.status]||'Starting';$('run-status').className='status-label '+statusClass(d.report.status);
 $('stop-run').hidden=!d.cancellable;$('run-baseline').hidden=!d.final||d.mode==='baseline';$('download-answer').hidden=!d.final;
 $('download-answer').href='/api/runs/'+d.id+'/download';
 const warning=d.report.error||(d.report.status==='needs_human_review'?'This candidate did not pass review. Read Astra’s feedback before using it.':'');
 $('run-error').textContent=warning;$('run-error').hidden=!warning;
 const strip=$('execution-strip');strip.replaceChildren();
 const stages=d.mode==='baseline'?[['Astra baseline',['baseline'],'Independent completion']]:[['Astra plans',['plan'],'Execution blueprint'],[d.config.routing==='auto'?'Body executes':d.config.body?.model||'Body executes',['execute','assemble'],'Build + repair'],['Astra reviews',['review'],'Acceptance checks']];
 strip.classList.toggle('baseline-strip',d.mode==='baseline');
 for(const [title,roles,sub] of stages){const node=el('div','execution-stage '+stageState(roles));node.append(el('i','status-dot'));const text=el('div');text.append(el('strong','',title),el('p','',sub));node.append(text);strip.append(node);}
 $('metric-calls').textContent=d.ledger.length;
 const usages=d.ledger.filter(c=>c.usage);const tokens=usages.reduce((sum,c)=>sum+(c.usage.input_tokens||0)+(c.usage.output_tokens||0),0);
 $('metric-tokens').textContent=usages.length?count(tokens)+(usages.length<d.ledger.length?' +':''):'—';
 const allKnown=d.ledger.length&&d.ledger.every(c=>c.cost_usd!=null);
 const total=allKnown?d.ledger.reduce((sum,c)=>sum+c.cost_usd,0):null;
 $('metric-cost').textContent=money(d.report.total_cost_usd??total);
 const signature=JSON.stringify([d.result,d.blueprint,d.reviews,d.ledger,d.report.status,state.tab]);
 if(state.signature!==signature){renderTab();state.signature=signature;}
 const baselines=state.runs.filter(r=>r.report.status==='baseline_complete'&&r.report.input_sha256&&r.report.input_sha256===d.report.input_sha256&&r.id!==d.id);
 $('comparison').hidden=!d.final||d.mode==='baseline'||!baselines.length;
 const previous=$('baseline-select').value;$('baseline-select').replaceChildren();
 for(const b of baselines){const o=el('option','',b.title+' · '+when(b.created));o.value=b.id;$('baseline-select').append(o);}
 if(baselines.some(b=>b.id===previous))$('baseline-select').value=previous;
}
function markdown(text){
 const root=el('div','markdown');let code=null,lines=[],list=null;
 const addLine=line=>{if(!line.trim()){list=null;return;}const h=line.match(/^(#{1,3})\s+(.+)$/);if(h){root.append(el('h'+h[1].length,'',h[2]));list=null;}else if(/^[-*] /.test(line)){if(!list){list=el('ul');root.append(list);}list.append(el('li','',line.slice(2)));}else{root.append(el('p','',line));list=null;}};
 for(const line of String(text).split('\n')){if(line.trim().startsWith('```')){if(code){code.textContent=lines.join('\n');root.append(code);code=null;lines=[];}else{code=el('pre');list=null;}continue;}if(code)lines.push(line);else addLine(line);}
 if(code){code.textContent=lines.join('\n');root.append(code);}return root;
}
function empty(title,text){const box=el('div','empty-state');box.append(el('div','empty-symbol','[ · ]'),el('h3','',title),el('p','',text));return box;}
function renderOutput(root,d){
 if(d.routing?.length){root.append(el('p','route-reason',d.routing.map(r=>r.reason).join(' ')));}
 if(!d.result){root.append(empty(terminal.has(d.report.status)?'No deliverable yet':'The work is underway',terminal.has(d.report.status)?'This run stopped before producing a candidate. Check the run status and usage.':'The blueprint, execution and review will appear here as each stage finishes.'));return;}
 if(!d.final)root.append(el('p','notice','Unaccepted candidate · Review is required before use.'));
 root.append(markdown(d.result.answer));
 if(d.result.artifacts?.length){
  const bar=el('div','artifact-bar');const select=el('select');select.setAttribute('aria-label','Output file');
  d.result.artifacts.forEach(a=>{const o=el('option','',a.path);o.value=a.path;select.append(o);});
  const link=el('a','btn btn-sm','Download file ↓');link.hidden=!d.final;const preview=el('pre','code');
  const update=()=>{const a=d.result.artifacts.find(a=>a.path===select.value);preview.textContent=a.content;link.href='/api/runs/'+d.id+'/download?path='+encodeURIComponent(a.path);};
  select.onchange=update;bar.append(select,link);root.append(bar,preview);update();
 }
 if(d.result.uncertainties?.length){const box=el('div','result-uncertainties');box.append(el('span','mono-label','Assumptions & uncertainties'));d.result.uncertainties.forEach(t=>box.append(el('p','',t)));root.append(box);}
}
function renderBlueprint(root,d){
 const b=d.blueprint;if(!b){root.append(empty('Waiting for the blueprint',d.mode==='baseline'?'An Astra-only baseline completes the brief directly, without a separate blueprint.':'Astra’s execution steps and acceptance criteria will appear when planning finishes.'));return;}
 root.append(el('p','blueprint-goal',b.goal));
 for(const s of b.steps){const row=el('div','step-row');row.append(el('span','step-id',s.id));const body=el('div');body.append(el('p','',s.instructions));body.append(el('div','mono-label','Criteria: '+s.criteria_ids.join(', ')+' · Depends on: '+(s.depends_on.join(', ')||'none')));row.append(body);root.append(row);}
 const criteria=el('div','criteria-list');criteria.append(el('span','mono-label','Acceptance criteria'));
 for(const c of b.criteria){const row=el('div','criterion');row.append(el('span','criterion-id',c.id),el('span','',c.requirement));criteria.append(row);}root.append(criteria);
 for(const key of ['constraints','assumptions']){if(b[key].length){const part=el('div','result-uncertainties');part.append(el('span','mono-label',key));b[key].forEach(t=>part.append(el('p','',t)));root.append(part);}}
 root.append(el('p','usage-note','Assembly: '+b.assembly_instructions));
}
function renderReviews(root,d){
 if(!d.reviews.length){root.append(empty('No review yet',d.mode==='baseline'?'This is an independent Astra completion. There is no separate review call.':'Astra will check the candidate against the original brief and every acceptance criterion.'));return;}
 d.reviews.forEach((review,index)=>{
  const heading=el('div','review-heading');heading.append(el('h3','',`Review ${index+1}`),el('span','status-label '+(review.approved?'good':'warn'),review.approved?'Approved':'Changes requested'));root.append(heading);
  for(const c of review.criteria){const row=el('div','criterion '+(c.passed?'passed':'failed'));row.append(el('span','criterion-id',c.id+' '+(c.passed?'✓':'×')),el('span','',c.evidence));root.append(row);}
  if(review.feedback.length){const f=el('div','review-feedback');review.feedback.forEach(t=>f.append(el('p','',t)));root.append(f);}
 });
}
function renderUsage(root,d){
 if(!d.ledger.length){root.append(empty('No calls recorded','Usage will appear after the first call starts.'));return;}
 const wrap=el('div','table-wrap'),table=el('table'),head=el('thead'),tr=el('tr');
 ['Stage','Model','Input','Cached','Output','Seconds','Cost'].forEach(t=>tr.append(el('th','',t)));head.append(tr);table.append(head);const body=el('tbody');
 for(const c of d.ledger){const row=el('tr');[labels[c.role]||c.role,c.model,c.usage?count(c.usage.input_tokens):'—',c.usage?count(c.usage.cached_input_tokens||0):'—',c.usage?count(c.usage.output_tokens):'—',c.seconds??(c.status==='started'?'Running':'—'),money(c.cost_usd)].forEach(t=>row.append(el('td','',t)));body.append(row);}table.append(body);wrap.append(table);root.append(wrap,el('p','usage-note','Unknown usage or prices are never counted as zero. Costs include every recorded planning, execution, review and repair call.'));
}
function renderTab(){
 const root=$('tab-content');root.replaceChildren();const d=state.detail;if(!d)return;
 document.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tab===state.tab));b.tabIndex=b.dataset.tab===state.tab?0:-1;});
 root.setAttribute('aria-labelledby','tab-'+state.tab);
 if(state.tab==='output')renderOutput(root,d);
 if(state.tab==='blueprint')renderBlueprint(root,d);
 if(state.tab==='review')renderReviews(root,d);
 if(state.tab==='usage')renderUsage(root,d);
 if(state.tab==='brief'){root.append(markdown(d.source.brief||'Brief is loading.'));for(const f of d.source.context||[]){root.append(el('h3','',f.name),el('pre','code',f.content));}}
}
function renderFiles(){const root=$('file-list');root.replaceChildren();state.files.forEach((file,index)=>{const row=el('div','file-item');row.append(el('span','',file.name+' · '+Math.max(1,Math.round(new TextEncoder().encode(file.content).length/1024))+' KB'));const remove=el('button','','×');remove.type='button';remove.setAttribute('aria-label','Remove '+file.name);remove.onclick=()=>{state.files.splice(index,1);renderFiles();};row.append(remove);root.append(row);});}
function connections(){ $('brain-key-field').hidden=$('brain-backend').value!=='responses';$('connections-dialog').showModal();}
async function refresh(){
 if(state.locked)return;
 if(state.loading)return;state.loading=true;
 try{state.runs=await api('/api/runs');renderHistory();if(state.selected){const selected=state.selected;const d=await api('/api/runs/'+selected);if(state.selected===selected){state.detail=d;renderDetail();}}$('connection-state').textContent=state.cloud?'Cloudflare connected':'Local connection';state.connected=true;}
 catch(e){$('connection-state').textContent='Disconnected';if(state.connected)toast('Connection lost. Make sure the local app server is running.');state.connected=false;}
 finally{state.loading=false;}
}
$('new-run').onclick=newRun;$('connections').onclick=connections;$('top-connections').onclick=connections;$('body-key-link').onclick=connections;
$('close-connections').onclick=()=>$('connections-dialog').close();
$('brain-backend').onchange=()=>{$('brain-key-field').hidden=$('brain-backend').value!=='responses';renderProvider();};
$('connections-form').onsubmit=async e=>{e.preventDefault();try{if(state.cloud){const r=await api('/api/setup',{password:$('workspace-password')?.value||'',api_key:$('brain-key').value.trim(),body_key:$('body-key').value.trim()});state.token=r.token;state.locked=false;$('brain-key').value='';$('body-key').value='';document.querySelectorAll('.setup-banner').forEach(n=>n.remove());await refresh();}savePreferences();renderProvider();$('connections-dialog').close();toast('Connections saved.');}catch(err){toast(err.message);}};
$('clear-keys').onclick=()=>{$('brain-key').value='';$('body-key').value='';toast('Session keys cleared.');};
$('body-provider').onchange=providerChanged;
$('brief').oninput=()=>{$('char-count').textContent=count($('brief').value.length)+' characters';};
$('use-example').onclick=()=>{$('brief').value=state.example;$('brief').oninput();$('brief').focus();};
$('attachments').onchange=async e=>{showError('');try{const incoming=Array.from(e.target.files);if(state.files.length+incoming.length>12)throw new Error('Attach up to 12 text files.');const added=[];for(const file of incoming){if(file.size>150000)throw new Error(file.name+' exceeds 150 KB.');const buffer=await file.arrayBuffer();const content=new TextDecoder('utf-8',{fatal:true}).decode(buffer);if(content.includes('\u0000'))throw new Error('Please attach text files only.');added.push({name:file.name,content});}const merged=state.files.concat(added);if(new TextEncoder().encode(JSON.stringify(merged)+$('brief').value).length>150000)throw new Error('Brief and attachments must total less than 150 KB.');state.files=merged;renderFiles();}catch(err){showError(err.message||'Could not read this text file.');}finally{e.target.value='';}};
$('discover').onclick=async()=>{const b=$('discover');b.disabled=true;$('discovery-status').textContent='Connecting to your model server…';try{const data=await api('/api/models',{base_url:$('body-url').value.trim(),key:$('body-key').value.trim()});$('model-list').replaceChildren();for(const model of data.models){const o=el('option');o.value=model;$('model-list').append(o);}if(data.models.length&&!$('body-model').value)$('body-model').value=data.models[0];$('discovery-status').textContent=data.models.length?`${data.models.length} models available. Choose a model ID above.`:'Connected, but no models were listed. Load a model on your server.';savePreferences();}catch(e){$('discovery-status').textContent=e.message;}finally{b.disabled=false;}};
$('run-form').onsubmit=async e=>{e.preventDefault();showError('');const button=$('run-button');if(state.locked){connections();return;}button.disabled=true;try{savePreferences();const result=await api('/api/runs',{brief:$('brief').value,context:state.files,config:getConfig(),credentials:credentials()});await refresh();await openRun(result.id);}catch(err){showError(err.message);}finally{button.disabled=false;}};
$('reuse-brief').onclick=()=>{const d=state.detail;$('brief').value=d.source.brief||'';state.files=structuredClone(d.source.context||[]);$('brief').oninput();renderFiles();newRun();toast('Brief and sources copied. Choose models for the new run.');};
$('stop-run').onclick=async()=>{const b=$('stop-run');b.disabled=true;try{await api('/api/runs/'+state.selected+'/cancel',{});await refresh();}catch(e){toast(e.message);}finally{b.disabled=false;}};
$('run-baseline').onclick=async()=>{const b=$('run-baseline');b.disabled=true;try{const result=await api('/api/runs/'+state.selected+'/baseline',{credentials:{brain:$('brain-key').value.trim(),body:$('body-key').value.trim()}});await refresh();await openRun(result.id);}catch(e){toast(e.message);}finally{b.disabled=false;}};
$('compare-button').onclick=async()=>{try{const r=await api('/api/runs/'+state.selected+'/compare',{baseline_id:$('baseline-select').value});$('compare-result').textContent=r.cost_ratio==null?'Cost comparison is unavailable because usage or prices are unknown.':`Mixed: ${money(r.mixed_cost_usd)} · Astra-only: ${money(r.baseline_cost_usd)} · ${r.cost_ratio.toFixed(2)}× the baseline cost. ${r.tenfold_cost_target_met?'10× cost target met for this run.':'10× cost target not met.'} Quality parity is not measured.`;}catch(e){$('compare-result').textContent=e.message;}};
const tabs=Array.from(document.querySelectorAll('[data-tab]'));tabs.forEach((button,index)=>{button.onclick=()=>{state.tab=button.dataset.tab;state.signature='';renderTab();};button.onkeydown=e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();}};});
async function init(){
 try{const boot=await api('/api/bootstrap');state.token=boot.token||'';state.defaults=boot.defaults;state.example=boot.example;state.cloud=Boolean(boot.cloud);state.locked=Boolean(boot.locked);loadPreferences();if(state.cloud){$('workspace-unlock').hidden=false;$('brain-backend').value='responses';$('brain-backend').querySelector('[value=codex]').disabled=true;for(const v of ['ollama','lmstudio'])$('body-provider').querySelector('[value='+v+']').remove();const q=el('option','','Open model · Qwen on Cloudflare');q.value='qwen';$('body-provider').append(q);if(!['auto','luna','custom','qwen'].includes($('body-provider').value))$('body-provider').value='auto';$('brain-backend').closest('form').querySelector('.session-note').textContent='Cloud keys are encrypted in the private workspace. Localhost endpoints are not reachable from Cloudflare.';if(boot.locked){$('connection-state').textContent='Workspace locked';$('history').textContent='Unlock to view your runs.';$('workspace').prepend(el('div','setup-banner','Unlock your workspace in Connections to start tasks and view history.'));}if(!boot.api_key_available){$('workspace').prepend(el('div','setup-banner','Connect an OpenAI API key in Connections to use Astra.'));} }renderProvider();$('codex-state').textContent=state.cloud?'Cloudflare runtime · API connections only':boot.codex_available?'Codex CLI is installed. Runs use your existing login.':'Codex CLI was not found. Choose OpenAI API.';if(boot.api_key_available)$('brain-key').placeholder='Server OpenAI key is available';await refresh();renderProvider();const match=location.hash.match(/^#run=([A-Za-z0-9_-]+)$/);if(match&&!state.locked)await openRun(match[1]);setInterval(refresh,1800);}catch(e){showError('Cannot connect to ACENET. Start the local server, then refresh this page.');$('connection-state').textContent='Disconnected';$('run-button').disabled=true;}
}
document.querySelectorAll('[data-suggestion]').forEach(b=>b.onclick=()=>{$('brief').value=b.dataset.suggestion;$('brief').oninput();$('brief').focus();});
init();
