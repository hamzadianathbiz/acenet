import unittest,tempfile,json,os,sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from bridge import plan_environment,snapshot,claude_login,claude_call
class Tests(unittest.TestCase):
 def test_api_overrides_removed(self):
  with patch.dict(os.environ,{'OPENAI_API_KEY':'secret','CODEX_API_KEY':'secret','CODEX_ACCESS_TOKEN':'secret','OPENAI_BASE_URL':'https://provider','PATH':'keep'}):
   env=plan_environment();self.assertEqual(env['PATH'],'keep');self.assertNotIn('OPENAI_API_KEY',env);self.assertNotIn('CODEX_ACCESS_TOKEN',env)
 def test_step_model_activity_and_plan_billing(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);(root/'blueprint.json').write_text(json.dumps({'steps':[{'id':'S1','instructions':'Normalize the supplied rows'}]}));(root/'ledger.json').write_text(json.dumps([{'role':'execute','model':'gpt-5.6-luna','backend':'codex','cost_usd':5,'status':'started'}]));r=snapshot(root);self.assertEqual(r['ledger'][0]['task'],'Normalize the supplied rows');self.assertEqual(r['ledger'][0]['step_id'],'S1');self.assertEqual(r['ledger'][0]['billing'],'chatgpt_plan');self.assertIsNone(r['ledger'][0]['cost_usd'])
 def test_claude_native_runner_allows_connectors_without_shell_or_file_tools(self):
  with tempfile.TemporaryDirectory() as d, patch('bridge.claude_login',return_value=True), patch('bridge.subprocess.run') as run:
   run.return_value=__import__('subprocess').CompletedProcess([],0,json.dumps({'structured_output':{'answer':'ok'},'usage':{'input_tokens':10},'modelUsage':{'claude-test':{}}}),'')
   result,usage=claude_call({'model':'haiku'},'task',{'type':'object'},Path(d))
   self.assertEqual(json.loads(result),{'answer':'ok'});self.assertEqual(usage['input_tokens'],10)
   cmd=run.call_args.args[0];self.assertIn('--restricted',cmd);self.assertNotIn('--strict-mcp-config',cmd);self.assertNotIn('--safe-mode',cmd);self.assertIn('Bash',cmd[cmd.index('--disallowedTools')+1]);self.assertNotIn('--bare',cmd);self.assertNotIn('--dangerously-skip-permissions',cmd)
 def test_claude_api_login_is_not_reported_as_subscription(self):
  with patch('shutil.which',return_value='/bin/claude'),patch('bridge.subprocess.run') as run:
   run.return_value=__import__('subprocess').CompletedProcess([],0,json.dumps({'loggedIn':True,'authMethod':'api_key'}),'')
   self.assertFalse(claude_login())
if __name__=='__main__':unittest.main()
