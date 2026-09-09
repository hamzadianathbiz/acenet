'use strict';
// Standard USD / million tokens, checked 2026-09-07 against the linked model pages.
(()=>{
const rates={'gpt-6-astra':{input:10,cached:1,output:50},'gpt-5.6-luna':{input:.2,cached:.02,output:1.2}};
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
function tokenCost(u,r){if(!u||!r||!finite(u.input_tokens)||!finite(u.output_tokens))return null;const cached=u.cached_input_tokens??0;if(!finite(cached)||cached>u.input_tokens)return null;const long=u.input_tokens>272000;return ((u.input_tokens-cached)*r.input*(long?2:1)+cached*r.cached*(long?2:1)+u.output_tokens*r.output*(long?1.5:1))/1e6;}
function callCost(c){if(c.backend==='openrouter')return c.usage?.free_price_verified===true&&c.usage?.api_equivalent_cost_usd===0?0:null;if(c.backend==='chat'&&c.billing==='local_model')return 0;const u=c.usage;if(c.backend==='claude')return finite(u?.api_equivalent_cost_usd)?u.api_equivalent_cost_usd:null;return tokenCost(u,rates[c.model]);}
function compare(run){
 if(!['accepted_by_astra','baseline_complete','needs_human_review','failed','cancelled'].includes(run.report?.status))return null;
 const ledger=run.ledger||[],costs=ledger.map(callCost),missing=costs.filter(c=>c===null).length;
 const harness=ledger.length&&!missing?costs.reduce((a,b)=>a+b,0):null;
 // A one-response counterfactual, never an invented second model run. No quality claim.
 const source=run.source,result=run.result;
 const sourceInput=source?Math.ceil(JSON.stringify(source).length/4):null;
 const overheadRows=ledger.filter(c=>c.backend==='codex'&&c.model==='gpt-6-astra'&&c.connectors_enabled===false&&finite(c.usage?.input_tokens)&&finite(c.prompt_bytes));
 const overhead=overheadRows.length?Math.max(0,Math.min(...overheadRows.map(c=>c.usage.input_tokens-Math.ceil(c.prompt_bytes/4)))):null;
 const input=sourceInput!==null?sourceInput+(overhead===null?0:overhead+300):null;
 const output=result?Math.ceil(JSON.stringify(result).length/4):null;
 const projected=input!==null&&output!==null?tokenCost({input_tokens:input,output_tokens:output},rates['gpt-6-astra']):null;
 const baseline=run.comparison_baseline,baselineCosts=baseline?.ledger?.map(callCost);
 const measured=baseline&&['baseline_complete','accepted_by_astra'].includes(baseline.report?.status)&&baselineCosts?.length&&baselineCosts.every(c=>c!==null)?baselineCosts.reduce((a,b)=>a+b,0):null;
 const direct=run.report?.route==='direct_astra'||run.mode==='baseline';
 const completed=['accepted_by_astra','baseline_complete'].includes(run.report?.status)&&!!result;
 const traditional=completed?(direct?harness:measured??projected):null;
 const saved=traditional!==null&&harness!==null?traditional-harness:null;
 return {traditional,harness,measured:measured!==null||direct,overhead,saved,percent:saved!==null&&traditional>0?saved/traditional*100:null,input,output,missing,calls:ledger.length,local:ledger.some(c=>c.backend==='chat'&&c.billing==='local_model'),rows:ledger.map((c,i)=>({model:c.model,role:c.role,cost:costs[i]})),ratesDate:'2026-09-07'};
}
function money(n){if(n===null||!Number.isFinite(n))return 'Unavailable';if(n===0)return '$0.00';if(Math.abs(n)<.0001)return (n<0?'-':'')+'<$0.0001';return (n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:Math.abs(n)<1?4:2});}
globalThis.AcenetCosts={compare,callCost,tokenCost,money,rates};
})();
