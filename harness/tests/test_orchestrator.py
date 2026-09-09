import json,tempfile,unittest
from pathlib import Path
from harness import Harness
PLAN={'goal':'Return the sum','constraints':[],'assumptions':[],'criteria':[{'id':'c1','requirement':'Return 42'}],'steps':[{'id':'s1','instructions':'Add the supplied numbers and return the answer','depends_on':[],'criteria_ids':['c1']}],'assembly_instructions':'Return answer'}
RESULT={'answer':'42','artifacts':[],'uncertainties':[]}
class OrchestratorTests(unittest.TestCase):
 def run_case(self,reject=False,body='chat',brain='gpt-6-astra'):
  config={'execution_policy':'astra-orchestrator-v3','brain':{'backend':'codex','model':brain},'body':{'backend':body,'model':'qwen'},'max_calls':60,'max_repairs':1}
  calls=[]
  def provider(c,p,s,d):
   role=d.name.split('-',1)[1];calls.append((role,c['model']));value=PLAN if role=='plan' else {'approved':not reject,'criteria':[{'id':'c1','passed':not reject,'evidence':'Checked sum'}],'feedback':['Wrong answer'] if reject else []} if role=='review' else RESULT
   return json.dumps(value),{'input_tokens':10,'output_tokens':2}
  with tempfile.TemporaryDirectory() as tmp:
   h=Harness(config,Path(tmp)/'run',provider);report=h.run('What is 20 plus 22?');return report,calls,(h.root/'blueprint.json').exists()
 def test_even_small_tasks_are_planned_by_astra_and_executed_by_open_model(self):
  report,calls,blueprint=self.run_case();self.assertEqual(report['status'],'accepted_by_astra');self.assertTrue(blueprint);self.assertEqual(calls,[('plan','gpt-6-astra'),('execute','qwen'),('review','gpt-6-astra')])
 def test_rejected_work_is_repaired_by_body_once_then_stops(self):
  report,calls,_=self.run_case(reject=True);self.assertEqual(report['status'],'needs_human_review');self.assertEqual(calls,[('plan','gpt-6-astra'),('execute','qwen'),('review','gpt-6-astra'),('assemble','qwen'),('review','gpt-6-astra')])
 def test_native_body_is_rejected_before_spending(self):
  report,calls,_=self.run_case(body='codex');self.assertEqual(report['status'],'failed');self.assertEqual(calls,[])
 def test_non_astra_brain_is_rejected_before_spending(self):
  report,calls,_=self.run_case(brain='other');self.assertEqual(report['status'],'failed');self.assertEqual(calls,[])
