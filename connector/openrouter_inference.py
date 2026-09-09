"""Hosted free-model body. Credentials remain out of task records and prompts."""
import json,urllib.request,urllib.error
from pathlib import Path

class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):raise RuntimeError('OpenRouter redirects are not allowed.')

def request(url,payload=None,key=None,timeout=25):
 headers={'Content-Type':'application/json','User-Agent':'ACENET/1.0','HTTP-Referer':'https://ace-acenet.pages.dev','X-OpenRouter-Title':'ACENET'}
 if key:headers['Authorization']='Bearer '+key
 req=urllib.request.Request(url,data=json.dumps(payload).encode() if payload is not None else None,headers=headers)
 try:
  with urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect()).open(req,timeout=timeout) as r:raw=r.read(5000001)
 except urllib.error.HTTPError as e:
  raise RuntimeError('OpenRouter request failed (%s). Reconnect for 401; retry later or select another free model for 429/503. No paid fallback was used.'%e.code) from None
 if len(raw)>5000000:raise RuntimeError('OpenRouter response exceeds size limit.')
 return json.loads(raw)

def free_model(row):
 pricing=row.get('pricing') or {}
 def zero(v):
  try:return v is not None and v!='' and not isinstance(v,bool) and float(v)==0
  except (ValueError,TypeError):return False
 return isinstance(row.get('id'),str) and row['id'].endswith(':free') and all(k in pricing for k in ('prompt','completion')) and all(zero(v) for v in pricing.values())

def openrouter_call(config,prompt,schema,directory,credential):
 model=config['model']
 row=next((m for m in request('https://openrouter.ai/api/v1/models').get('data',[]) if m.get('id')==model),None)
 if not row or not free_model(row):raise ValueError('This model is not currently free. Select another free model in ACENET. No paid fallback was used.')
 context=row.get('context_length');budget=4096
 if type(context) is not int or len(prompt.encode('utf-8'))+budget+512>context:raise ValueError('Task exceeds this hosted model context. Choose a larger free model. No source was truncated.')
 payload={'model':model,'messages':[{'role':'user','content':prompt}],'max_tokens':budget,'stream':False,'transforms':[], 'provider':{'allow_fallbacks':False,'max_price':{'prompt':0,'completion':0,'request':0,'image':0}},'plugins':[]}
 if 'structured_outputs' in row.get('supported_parameters',[]):
  payload['response_format']={'type':'json_schema','json_schema':{'name':'result','strict':True,'schema':schema}};payload['provider']['require_parameters']=True
 data=request('https://openrouter.ai/api/v1/chat/completions',payload,credential(),config.get('timeout',240))
 choice=(data.get('choices') or [{}])[0]
 if choice.get('finish_reason')!='stop':raise RuntimeError('Hosted model output is incomplete. No result was accepted.')
 text=choice.get('message',{}).get('content')
 if not isinstance(text,str):raise RuntimeError('Hosted model returned no text.')
 json.loads(text) # Harness validates the exact result schema too.
 usage=data.get('usage',{});cost=usage.get('cost')
 if cost is not None and (not isinstance(cost,(int,float)) or isinstance(cost,bool) or cost!=0):raise RuntimeError('OpenRouter reported unexpected nonzero usage cost. Execution stopped.')
 Path(directory,'response.json').write_text(json.dumps(data))
 Path(directory,'actual-models.json').write_text(json.dumps([str(data.get('model') or model)]))
 return text,{'input_tokens':usage.get('prompt_tokens',0),'output_tokens':usage.get('completion_tokens',0),'cached_input_tokens':usage.get('prompt_tokens_details',{}).get('cached_tokens',0),'api_equivalent_cost_usd':0,'free_price_verified':True}
