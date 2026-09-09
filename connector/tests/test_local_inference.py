import json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from local_inference import local_call
class Tests(unittest.TestCase):
 def inventory(self,model):return {'servers':[{'id':'ollama','online':True,'models':[{'id':model}]}]}
 def test_remote_alias_is_rejected_even_if_discovery_lists_it(self):
  with tempfile.TemporaryDirectory() as d,patch('local_models.discover_models',return_value=self.inventory('local-alias')),patch('local_inference.request_json',return_value={'remote_model':'cloud-model'}) as request:
   with self.assertRaisesRegex(ValueError,'cloud'):local_call({'base_url':'http://127.0.0.1:11434/v1','model':'local-alias'},'task',{},d)
   self.assertEqual(request.call_count,1)
 def test_native_request_disables_truncation_and_uses_full_schema(self):
  with tempfile.TemporaryDirectory() as d,patch('local_models.discover_models',return_value=self.inventory('qwen3:4b')),patch('local_inference.request_json') as request:
   request.side_effect=[{'model_info':{'qwen3.context_length':32768}}, {'done':True,'done_reason':'stop','message':{'content':'{"answer":"ok"}'},'prompt_eval_count':12,'eval_count':3}]
   schema={'type':'object'};result,usage=local_call({'base_url':'http://127.0.0.1:11434/v1','model':'qwen3:4b'},'A short task',schema,d)
   payload=request.call_args.args[1];self.assertIs(payload['truncate'],False);self.assertEqual(payload['format'],schema);self.assertGreaterEqual(payload['options']['num_ctx'],8192);self.assertLessEqual(payload['options']['num_ctx'],32768);self.assertIs(payload['think'],False);self.assertEqual(usage['output_tokens'],3);self.assertEqual(json.loads(result),{'answer':'ok'})
 def test_other_model_does_not_receive_invalid_thinking_override(self):
  with tempfile.TemporaryDirectory() as d,patch('local_models.discover_models',return_value=self.inventory('gpt-oss:20b')),patch('local_inference.request_json') as request:
   request.side_effect=[{'model_info':{'gptoss.context_length':32768}}, {'done':True,'done_reason':'stop','message':{'content':'{}'}}]
   local_call({'base_url':'http://127.0.0.1:11434/v1','model':'gpt-oss:20b'},'task',{},d);self.assertNotIn('think',request.call_args.args[1])
 def test_large_prompt_or_modelfile_rejected_before_generation(self):
  with tempfile.TemporaryDirectory() as d,patch('local_models.discover_models',return_value=self.inventory('qwen3:4b')),patch('local_inference.request_json',return_value={'model_info':{'qwen3.context_length':32768},'system':'x'*32000}) as request:
   with self.assertRaisesRegex(ValueError,'No source was truncated'):local_call({'base_url':'http://127.0.0.1:11434/v1','model':'qwen3:4b'},'task',{},d)
   self.assertEqual(request.call_count,1)
 def test_truncated_output_is_not_accepted(self):
  with tempfile.TemporaryDirectory() as d,patch('local_models.discover_models',return_value=self.inventory('qwen3:4b')),patch('local_inference.request_json') as request:
   request.side_effect=[{'model_info':{'qwen3.context_length':32768}},{'done':True,'done_reason':'length','message':{'content':'{}'}}]
   with self.assertRaisesRegex(RuntimeError,'incomplete'):local_call({'base_url':'http://127.0.0.1:11434/v1','model':'qwen3:4b'},'task',{},d)
 def test_arbitrary_server_and_disappeared_model_fail_before_generation(self):
  with tempfile.TemporaryDirectory() as d,patch('local_models.discover_models',return_value={'servers':[]}):
   for url in ['https://remote.test/v1','http://127.0.0.1:9000/v1','http://127.0.0.1:11434/v1']:
    with self.assertRaises(ValueError):local_call({'base_url':url,'model':'missing'},'task',{},d)
 def test_lm_studio_uses_loaded_context_and_strict_schema(self):
  inventory={'servers':[{'id':'lmstudio','online':True,'models':[{'id':'local-chat'}]}]}
  with tempfile.TemporaryDirectory() as d,patch('local_models.discover_models',return_value=inventory),patch('local_inference.request_json') as request:
   request.side_effect=[{'models':[{'key':'local-chat','loaded_instances':[{'id':'instance','config':{'context_length':8192}}]}]},{'choices':[{'finish_reason':'stop','message':{'content':'{}'}}],'usage':{'prompt_tokens':9,'completion_tokens':2}}]
   _,usage=local_call({'base_url':'http://127.0.0.1:1234/v1','model':'local-chat'},'task',{'type':'object'},d)
   payload=request.call_args.args[1];self.assertEqual(payload['max_tokens'],4096);self.assertTrue(payload['response_format']['json_schema']['strict']);self.assertEqual(usage['input_tokens'],9)
 def test_lm_studio_unloaded_model_fails_before_generation(self):
  inventory={'servers':[{'id':'lmstudio','online':True,'models':[{'id':'local-chat'}]}]}
  with tempfile.TemporaryDirectory() as d,patch('local_models.discover_models',return_value=inventory),patch('local_inference.request_json',return_value={'models':[{'key':'local-chat','loaded_instances':[]}]}) as request:
   with self.assertRaisesRegex(ValueError,'Load this model'):local_call({'base_url':'http://127.0.0.1:1234/v1','model':'local-chat'},'task',{},d)
   self.assertEqual(request.call_count,1)
if __name__=='__main__':unittest.main()
