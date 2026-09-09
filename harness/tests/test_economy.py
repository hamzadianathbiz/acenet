import json,tempfile,unittest
from pathlib import Path
from harness import Harness
from economy import apply_replacements,requires_connectors
RESULT={'answer':'The total is 42.','artifacts':[],'uncertainties':[]}
class EconomyTests(unittest.TestCase):
 def config(self):return {'execution_policy':'adaptive-v2','brain':{'backend':'codex','model':'astra'},'body':{'backend':'codex','model':'luna'},'max_calls':4,'max_repairs':0}
 def run_fixture(self,brief,verdict=None):
  calls=[]
  def provider(config,prompt,schema,d):
   calls.append((config.copy(),prompt));value=verdict if 'replacements' in schema['properties'] else RESULT
   return json.dumps(value),{'input_tokens':10,'output_tokens':10}
  with tempfile.TemporaryDirectory() as d:
   h=Harness(self.config(),Path(d)/'run',provider);report=h.run(brief);return report,calls,json.loads((h.root/'final.json').read_text()) if (h.root/'final.json').exists() else None
 def test_small_task_is_one_astra_call(self):
  report,calls,_=self.run_fixture('What is 6 times 7?');self.assertEqual(report['route'],'direct_astra');self.assertEqual(len(calls),1);self.assertEqual(calls[0][0]['model'],'astra')
 def test_body_draft_then_one_astra_correction_no_repeat_passes(self):
  report,calls,result=self.run_fixture('Write an implementation plan for a CSV importer.',{'approved':True,'findings':['Fix number'],'replacements':[{'path':'answer','before':'42','after':'43'}]})
  self.assertEqual([c[0]['model'] for c in calls],['luna','astra']);self.assertEqual(result['answer'],'The total is 43.');self.assertEqual(report['status'],'accepted_by_astra');self.assertFalse(calls[-1][0]['connectors'])
 def test_rejection_does_not_start_costly_repair_loop(self):
  report,calls,result=self.run_fixture('Write an implementation plan for a CSV importer.',{'approved':False,'findings':['Missing input'],'replacements':[]});self.assertEqual(report['status'],'needs_human_review');self.assertEqual(len(calls),2);self.assertIsNone(result)
 def test_missing_connector_evidence_cannot_be_accepted(self):
  report,calls,_=self.run_fixture('Search my Gmail for a meeting.');self.assertEqual(report['status'],'needs_human_review');self.assertEqual(len(calls),1);self.assertIn('No successful connector',report['error'])
 def test_ambiguous_or_missing_patch_is_rejected(self):
  with self.assertRaises(ValueError):apply_replacements(RESULT,[{'path':'answer','before':'absent','after':'x'}])
  with self.assertRaises(ValueError):apply_replacements(RESULT,[{'path':'missing.txt','before':'42','after':'x'}])

class EvidenceTests(unittest.TestCase):
 def test_actual_connector_results_reach_review_without_relying_on_body_claims(self):
  from economy import connector_evidence
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);call=root/'calls'/'01-draft';call.mkdir(parents=True)
   (call/'events.jsonl').write_text(json.dumps({'type':'item.completed','item':{'type':'mcp_tool_call','server':'codex_apps','tool':'calendar.list','status':'completed','result':{'content':[{'text':'{"count":2}'}]}}}))
   self.assertEqual(connector_evidence(root)[0]['result']['content'][0]['text'],'{"count":2}')

class DriveTests(unittest.TestCase):
 def test_drive_links_and_plain_drive_requests_enable_tools(self):
  from economy import requires_drive
  for text in ['Read my Drive','Analyze this Drive folder','https://docs.google.com/document/d/123','https://drive.google.com/drive/folders/123']:
   self.assertTrue(requires_drive(text));self.assertTrue(requires_connectors(text))
  self.assertFalse(requires_drive('Write a sales plan'))
 def test_other_apps_or_failed_drive_calls_do_not_prove_drive_access(self):
  from economy import drive_evidence
  self.assertEqual(drive_evidence([{'tool':'codex_apps/calendar.list','result':{}},{'tool':'claude_ai_Google_Drive/search_files','result':{'isError':True}}]),[])
  self.assertEqual(len(drive_evidence([{'tool':'codex_apps/gdrive.search','result':{}},{'tool':'mcp__claude_ai_Google_Drive__search_files','result':'found'}])),2)

class LargeEvidenceTests(unittest.TestCase):
 def test_sections_preserve_all_unicode_and_record_boundaries(self):
  from economy import evidence_sections
  evidence=[{'tool':'drive.fetch','result':'α😀'*100}]
  parts=evidence_sections(evidence,73)
  self.assertEqual(''.join(p['text'] for p in parts),json.dumps(evidence[0],ensure_ascii=False))
  self.assertTrue(all(len(p['text'].encode())<=73 for p in parts))
 def test_large_evidence_audits_every_section_and_preserves_original(self):
  from economy import review_evidence
  class Fake:
   def call(self,role,model,payload,schema):
    self.seen.append(payload['section_id']);return {'findings':[],'missing_points':[],'supporting_excerpts':[]}
  with tempfile.TemporaryDirectory() as d:
   h=Fake();h.root=Path(d);h.config={'body':{'backend':'codex'},'max_calls':4};h.ledger=[{}];h.seen=[]
   evidence=[{'tool':'drive.fetch','result':'x'*210000}]
   output=review_evidence(h,{'brief':'summarize'},RESULT,evidence)
   self.assertEqual(h.seen,[1,2,3]);self.assertEqual(output['coverage']['reviewed'],3)
   self.assertEqual(json.loads((h.root/'evidence-original.json').read_text()),evidence)
   self.assertFalse(h.config['evidence_body']['connectors'])

 def test_oversized_dataset_stops_before_any_audit_call(self):
  from economy import review_evidence
  class Fake:pass
  with tempfile.TemporaryDirectory() as d:
   h=Fake();h.root=Path(d);h.ledger=[];h.config={}
   with self.assertRaisesRegex(ValueError,'more than 16'):
    review_evidence(h,{},RESULT,[{'result':'x'*1700000}])
