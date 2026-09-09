import json,sys,tempfile,unittest,subprocess
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from bridge import claude_call,connector_prompt,codex_connector_command,CLAUDE_READ_TOOLS,snapshot

class ConnectorTests(unittest.TestCase):
 def test_prompt_preserves_task_and_gives_open_body_sources(self):
  original='Return JSON only. Do not call tools or access files. Deliver file contents as artifacts.\nPRIVATE TASK'
  p=connector_prompt(original)
  self.assertTrue(p.endswith('\nPRIVATE TASK'));self.assertIn('source links in the blueprint',p);self.assertIn('Do not send messages',p)
 def test_codex_apps_keep_approval_and_execution_boundaries(self):
  cmd=codex_connector_command(['codex','exec'])
  self.assertIn('apps',cmd);self.assertIn('approval_policy="never"',cmd);self.assertIn('apps._default.default_tools_approval_mode="writes"',cmd)
  self.assertIn('features.shell_tool=false',cmd);self.assertIn('features.unified_exec=false',cmd);self.assertIn('forced_login_method="chatgpt"',cmd)
 def test_claude_permissions_are_exact_read_operations(self):
  self.assertGreater(len(CLAUDE_READ_TOOLS),10)
  for t in CLAUDE_READ_TOOLS:
   self.assertNotIn('*',t)
   self.assertRegex(t.split('__')[-1],r'^(search_|list_|get_|read_|find_|web_search_|web_fetch_|notion-(search|fetch|list|query|get|ai-search))')
 def test_trace_contains_only_names_and_result_status(self):
  name='mcp__claude_ai_Google_Calendar__list_calendars'
  events=[{'type':'assistant','message':{'content':[{'type':'tool_use','id':'one','name':name,'input':{'private':'never upload'}}]}},{'type':'user','message':{'content':[{'type':'tool_result','tool_use_id':'one','content':'private calendar','is_error':False}]}},{'type':'result','structured_output':{'ok':True},'usage':{}}]
  with tempfile.TemporaryDirectory() as d,patch('bridge.claude_login',return_value=True),patch('bridge.subprocess.run',return_value=subprocess.CompletedProcess([],0,'\n'.join(map(json.dumps,events)),'')):
   claude_call({'model':'haiku'},'task',{},Path(d));trace=json.loads((Path(d)/'connector-tools.json').read_text())
   self.assertEqual(trace,[{'tool':name,'status':'completed'}])
 def test_permission_failure_is_not_reported_as_success(self):
  name='mcp__unavailable__read'
  events=[{'type':'assistant','message':{'content':[{'type':'tool_use','id':'one','name':name}]}},{'type':'result','structured_output':{'ok':False},'permission_denials':[{'tool_name':name}]}]
  with tempfile.TemporaryDirectory() as d,patch('bridge.claude_login',return_value=True),patch('bridge.subprocess.run',return_value=subprocess.CompletedProcess([],0,'\n'.join(map(json.dumps,events)),'')):
   claude_call({'model':'haiku'},'task',{},Path(d));self.assertEqual(json.loads((Path(d)/'connector-tools.json').read_text()),[{'tool':name,'status':'permission required'}])
 def test_codex_snapshot_never_copies_arguments_or_output(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);call=root/'calls'/'01-plan';call.mkdir(parents=True)
   (root/'ledger.json').write_text(json.dumps([{'call':1,'role':'plan','backend':'codex'}]))
   (call/'events.jsonl').write_text(json.dumps({'type':'item.completed','item':{'type':'mcp_tool_call','server':'codex_apps','tool':'calendar.list','status':'completed','arguments':{'secret':'query'},'result':{'secret':'data'}}}))
   self.assertEqual(snapshot(root)['ledger'][0]['connector_tools'],[{'tool':'codex_apps/calendar.list','status':'completed'}])
if __name__=='__main__':unittest.main()
