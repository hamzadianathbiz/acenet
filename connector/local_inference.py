"""Bounded native local inference, without proxying or silent prompt truncation."""
import json,urllib.request,urllib.error
from urllib.parse import urlparse
from pathlib import Path
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):raise ValueError('Local model redirects are not allowed.')

def request_json(url,data=None,timeout=10):
 req=urllib.request.Request(url,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'})
 opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
 with opener.open(req,timeout=timeout) as r:raw=r.read(2000001)
 if len(raw)>2000000:raise ValueError('Local model response exceeds the size limit.')
 return json.loads(raw)

def local_call(config,prompt,schema,directory):
 from local_models import discover_models
 u=urlparse(config['base_url'])
 if u.hostname not in ('localhost','127.0.0.1','::1') or u.scheme!='http' or u.username or u.password or u.query or u.fragment or u.path.rstrip('/')!='/v1' or u.port not in (11434,1234):raise ValueError('Use the detected Ollama or LM Studio server.')
 server='ollama' if u.port==11434 else 'lmstudio';model=config['model']
 found=next((s for s in discover_models()['servers'] if s['id']==server),{})
 if not found.get('online') or not any(m['id']==model for m in found.get('models',[])):raise ValueError('The selected local model is no longer available. Open its server or choose another model.')
 base='http://127.0.0.1:'+str(u.port);budget=4096;context=32768
 if server=='ollama':
  metadata=request_json(base+'/api/show',{'model':model});info=metadata.get('model_info',{})
  if metadata.get('remote_host') or metadata.get('remote_model'):raise ValueError('Ollama cloud models are not supported by the local runner.')
  prompt_overhead=len(json.dumps({k:metadata.get(k) for k in ('system','messages','template')}).encode('utf-8'))
  sizes=[v for k,v in info.items() if k.endswith('.context_length') and isinstance(v,int) and not isinstance(v,bool) and v>0]
  if not sizes:raise ValueError('Ollama did not report a context limit for this model. Choose a supported model.')
  context=min(context,min(sizes))
 else:
  prompt_overhead=0
  try:rows=request_json(base+'/api/v1/models').get('models',[])
  except urllib.error.HTTPError as e:
   if e.code==404:raise ValueError('Update LM Studio to version 0.4 or later to use this model safely.') from None
   raise
  row=next((m for m in rows if m.get('key')==model or any(i.get('id')==model for i in m.get('loaded_instances',[]))),{})
  instances=row.get('loaded_instances',[])
  sizes=[i.get('config',{}).get('context_length',0) for i in instances]
  if not sizes or not all(isinstance(v,int) and v>0 for v in sizes):raise ValueError('Load this model in LM Studio before running a task. Its active context size must be available.')
  context=min(sizes);budget=min(budget,context//2)
 if server=='ollama':
  budget=min(budget,context//2)
  needed=len(prompt.encode('utf-8'))+budget+prompt_overhead+512
  context=min(context,max(8192,((needed+2047)//2048)*2048))
 # UTF-8 byte count is a conservative token bound; reserve extra space for the chat template.
 if len(prompt.encode('utf-8'))+budget+prompt_overhead+512>context:raise ValueError('This task exceeds the local model context. Choose a larger context in your model app or switch back to the subscription body. No source was truncated.')
 if server=='ollama':
  payload={'model':model,'messages':[{'role':'user','content':prompt}],'format':schema,'stream':False,'truncate':False,'options':{'num_ctx':context,'num_predict':budget}}
  if model.startswith('qwen3:'):payload['think']=False
  data=request_json(base+'/api/chat',payload,config.get('timeout',240))
  if data.get('done') is not True or data.get('done_reason')!='stop':raise RuntimeError('Local model output is incomplete. No result was accepted.')
  text=data.get('message',{}).get('content');usage={'input_tokens':data.get('prompt_eval_count',0),'output_tokens':data.get('eval_count',0),'cached_input_tokens':data.get('prompt_eval_cached_count',0)}
 else:
  data=request_json(base+'/v1/chat/completions',{'model':model,'messages':[{'role':'user','content':prompt}],'max_tokens':budget,'response_format':{'type':'json_schema','json_schema':{'name':'result','strict':True,'schema':schema}}},config.get('timeout',240))
  choice=(data.get('choices') or [{}])[0]
  if choice.get('finish_reason')!='stop':raise RuntimeError('Local model output is incomplete. No result was accepted.')
  text=choice.get('message',{}).get('content');u=data.get('usage',{});usage={'input_tokens':u.get('prompt_tokens',0),'output_tokens':u.get('completion_tokens',0),'cached_input_tokens':u.get('prompt_tokens_details',{}).get('cached_tokens',0)}
 if not isinstance(text,str):raise RuntimeError('Local model returned no text output.')
 json.loads(text)
 Path(directory,'response.json').write_text(json.dumps(data))
 return text,usage
