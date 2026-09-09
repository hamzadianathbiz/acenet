import sys,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from openrouter_inference import openrouter_call,free_model
MODEL={'hugging_face_id':'test/body','id':'test/body:free','pricing':{'prompt':'0','completion':'0'},'context_length':32768,'supported_parameters':['structured_outputs']}
class OpenRouterTests(unittest.TestCase):
 def test_free_means_all_prices_known_zero(self):
  self.assertTrue(free_model(MODEL))
  for prices in ({'prompt':'0'},{'prompt':'0','completion':None},{'prompt':'0','completion':'0','request':'.1'},{'prompt':False,'completion':0}):self.assertFalse(free_model({**MODEL,'pricing':prices}))
 def test_free_call_has_zero_ceiling_and_no_fallback_or_truncation(self):
  calls=[]
  def response(url,payload=None,key=None,timeout=25):
   calls.append((url,payload,key))
   if payload is None:return {'data':[MODEL]}
   return {'model':MODEL['id'],'choices':[{'finish_reason':'stop','message':{'content':'{"answer":"ok"}'}}],'usage':{'cost':0,'prompt_tokens':3,'completion_tokens':4}}
  with tempfile.TemporaryDirectory() as d,patch('openrouter_inference.request',side_effect=response):
   text,usage=openrouter_call({'model':MODEL['id']},'task',{'type':'object'},d,lambda:'secret')
   payload=calls[-1][1];self.assertEqual(payload['provider']['max_price']['prompt'],0);self.assertFalse(payload['provider']['allow_fallbacks']);self.assertEqual(payload['transforms'],[]);self.assertEqual(usage['api_equivalent_cost_usd'],0)
   self.assertNotIn('secret',Path(d,'response.json').read_text())
 def test_price_change_and_oversize_fail_before_credential_fetch(self):
  for row,prompt in [({**MODEL,'pricing':{'prompt':1,'completion':0}},'task'),(MODEL,'x'*33000)]:
   with tempfile.TemporaryDirectory() as d,patch('openrouter_inference.request',return_value={'data':[row]}),patch('builtins.input') as credential:
    with self.assertRaises(ValueError):openrouter_call({'model':MODEL['id']},prompt,{},d,credential)
    credential.assert_not_called()
 def test_incomplete_output_rejected(self):
  with tempfile.TemporaryDirectory() as d,patch('openrouter_inference.request',side_effect=[{'data':[MODEL]},{'choices':[{'finish_reason':'length','message':{'content':'{}'}}]}]):
   with self.assertRaises(RuntimeError):openrouter_call({'model':MODEL['id']},'task',{},d,lambda:'secret')
if __name__=='__main__':unittest.main()
