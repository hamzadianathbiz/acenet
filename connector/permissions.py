"""Native Claude permission callback; only the signed-in browser user can allow a call."""
import json,sys,time,uuid
from pathlib import Path

def approve(arguments,root,timeout=180):
 name=arguments.get('tool_name','');inputs=arguments.get('input',{})
 if not name.startswith('mcp__') or name.startswith('mcp__acenet_permissions__') or not isinstance(inputs,dict):return {'behavior':'deny','message':'Only connector tools can be approved here.'}
 if len(json.dumps(inputs))>32000:return {'behavior':'deny','message':'Permission request is too large.'}
 root=Path(root);root.mkdir(parents=True,exist_ok=True);identity=str(uuid.uuid4());path=root/(identity+'.request.json')
 request={'id':identity,'tool':name,'input':inputs,'expires':int(time.time()*1000)+timeout*1000,'status':'pending'};path.write_text(json.dumps(request))
 try:
  while time.time()*1000<request['expires']:
   reply=root/(identity+'.response.json')
   if reply.exists():
    decision=json.loads(reply.read_text());allowed=decision.get('allowed') is True
    return {'behavior':'allow','updatedInput':inputs} if allowed else {'behavior':'deny','message':'The user declined this connector action.'}
   time.sleep(.25)
  return {'behavior':'deny','message':'Connector approval expired. Retry the task and approve it in ACENET.'}
 finally:
  request['status']='finished';path.write_text(json.dumps(request))

def main():
 root=sys.argv[1]
 for line in sys.stdin:
  try:
   message=json.loads(line);method=message.get('method');ident=message.get('id')
   if ident is None:continue
   if method=='initialize':result={'protocolVersion':'2024-11-05','capabilities':{'tools':{}},'serverInfo':{'name':'acenet-permissions','version':'1'}}
   elif method=='ping':result={}
   elif method=='tools/list':result={'tools':[{'name':'approve','description':'Ask the signed-in ACENET user to approve exactly one native connector action.','inputSchema':{'type':'object','properties':{'tool_name':{'type':'string'},'input':{'type':'object'}},'required':['tool_name','input']}}]}
   elif method=='tools/call' and message.get('params',{}).get('name')=='approve':result={'content':[{'type':'text','text':json.dumps(approve(message['params'].get('arguments',{}),root))}]}
   else:
    print(json.dumps({'jsonrpc':'2.0','id':ident,'error':{'code':-32601,'message':'Unknown method'}}),flush=True);continue
   print(json.dumps({'jsonrpc':'2.0','id':ident,'result':result}),flush=True)
  except Exception:
   if 'ident' in locals() and ident is not None:print(json.dumps({'jsonrpc':'2.0','id':ident,'error':{'code':-32603,'message':'Permission service failed closed'}}),flush=True)
if __name__=='__main__':main()
