import copy
import http.client
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import server

CONFIG = {'brain': {'backend':'codex','model':'gpt-6-astra','rates':None},
          'body': {'backend':'codex','model':'gpt-5.6-luna','rates':None},'max_calls':12,'max_repairs':1}


class WebTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.root=Path(cls.temp.name)
        worker=cls.root/'fake_worker.py'
        worker.write_text('''import sys,json,time
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from harness import Harness
j=json.load(sys.stdin)
plan=dict(goal='Test',constraints=[],assumptions=[],criteria=[dict(id='C1',requirement='Answer')],steps=[dict(id='S1',instructions='Answer',depends_on=[],criteria_ids=['C1'])],assembly_instructions='Return')
result=dict(answer='Fixture answer',artifacts=[dict(path='file.txt',content='<script>untrusted</script>')],uncertainties=[])
review=dict(criteria=[dict(id='C1',passed=True,evidence='Present')],approved=True,feedback=[])
def provider(c,p,s,d):
 if 'SLOW' in j['brief']:time.sleep(30)
 value=plan if 'goal' in s['properties'] else review if 'approved' in s['properties'] else result
 return json.dumps(value),dict(input_tokens=10,output_tokens=10,cached_input_tokens=0)
Harness(j['config'],j['directory'],provider).run(j['brief'],j['context'],baseline=j['baseline'])
''')
        cls.manager=server.Manager(cls.root/'runs',cls.root/'state',[os.sys.executable,str(worker),str(server.HARNESS)])
        cls.http=server.make_server(0,cls.manager)
        cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
        cls.port=cls.http.server_port

    @classmethod
    def tearDownClass(cls):
        for ident,p in cls.manager.jobs.items():
            if p.poll() is None:cls.manager.cancel(ident)
        cls.http.shutdown();cls.http.server_close();cls.temp.cleanup()

    def request(self,method,path,data=None,headers=None):
        h={'Host':'127.0.0.1:'+str(self.port)}
        if method=='POST':h.update({'Origin':'http://127.0.0.1:'+str(self.port),'X-ACENET-Token':self.http.token,'Content-Type':'application/json'})
        h.update(headers or {})
        conn=http.client.HTTPConnection('127.0.0.1',self.port)
        conn.request(method,path,body=json.dumps(data) if data is not None else None,headers=h)
        response=conn.getresponse();body=response.read();result=(response.status,dict(response.getheaders()),body);conn.close();return result

    def payload(self,brief='Test brief'):
        return {'brief':brief,'context':[],'config':copy.deepcopy(CONFIG),'credentials':{}}

    def wait_done(self,ident):
        for _ in range(100):
            d=self.manager.detail(ident)
            if d['report'].get('status') in server.TERMINAL:return d
            time.sleep(.03)
        self.fail('Job did not finish')

    def test_static_allowlist(self):
        for path in ('/server.py','/.state/jobs.json','/../../CLAUDE.md','/assets/../../server.py'):
            self.assertEqual(self.request('GET',path)[0],404)
        status,headers,body=self.request('GET','/')
        self.assertEqual(status,200);self.assertIn(b'Give the brain a brief',body)
        self.assertIn("frame-ancestors 'none'",headers['Content-Security-Policy'])

    def test_origin_host_token(self):
        self.assertEqual(self.request('POST','/api/runs',self.payload(),{'Origin':'https://evil.example'})[0],403)
        self.assertEqual(self.request('POST','/api/runs',self.payload(),{'X-ACENET-Token':'wrong'})[0],403)
        self.assertEqual(self.request('GET','/api/bootstrap',headers={'Host':'evil.example'})[0],403)
        self.assertEqual(self.request('GET','/api/runs',headers={'Sec-Fetch-Site':'cross-site'})[0],403)

    def test_validation(self):
        self.assertEqual(self.request('POST','/api/runs',self.payload(''))[0],400)
        p=self.payload();p['context']=[{'name':'bad','content':None}]
        self.assertEqual(self.request('POST','/api/runs',p)[0],400)
        p=self.payload();p['config']['brain']['model']='other'
        self.assertEqual(self.request('POST','/api/runs',p)[0],400)
        with self.assertRaises(ValueError):server.endpoint('http://remote.example/v1')
        with self.assertRaises(ValueError):server.endpoint('https://user:secret@remote.example/v1')
        with self.assertRaises(ValueError):self.manager.directory('../escape')

    def test_run_result_and_attachment(self):
        status,_,body=self.request('POST','/api/runs',self.payload())
        self.assertEqual(status,202);ident=json.loads(body)['id'];d=self.wait_done(ident)
        self.assertEqual(d['report']['status'],'accepted_by_astra');self.assertTrue(d['final'])
        status,headers,body=self.request('GET','/api/runs/'+ident+'/download?path=file.txt')
        self.assertEqual(status,200);self.assertEqual(headers['Content-Type'],'application/octet-stream')
        self.assertIn('attachment;',headers['Content-Disposition']);self.assertIn(b'<script>',body)
        self.assertEqual(self.request('GET','/api/runs/'+ident+'/download?path=../../secret')[0],404)

    def test_baseline_reuses_exact_input(self):
        ident=self.manager.launch(self.payload('Baseline comparison'));d=self.wait_done(ident)
        _,_,body=self.request('POST','/api/runs/'+ident+'/baseline',{'credentials':{}})
        base=json.loads(body)['id'];b=self.wait_done(base)
        self.assertEqual(b['report']['input_sha256'],d['report']['input_sha256'])
        self.assertEqual(b['report']['status'],'baseline_complete')
        self.assertEqual(self.request('POST','/api/runs/'+ident+'/compare',{'baseline_id':base})[0],200)

    def test_cancel_blocks_exports_and_concurrent_run(self):
        ident=self.manager.launch(self.payload('SLOW'))
        with self.assertRaises(ValueError):self.manager.launch(self.payload())
        status,_,_=self.request('POST','/api/runs/'+ident+'/cancel',{})
        self.assertEqual(status,200)
        d=self.manager.detail(ident);self.assertEqual(d['report']['status'],'cancelled');self.assertFalse(d['final'])
        self.assertEqual(self.request('GET','/api/runs/'+ident+'/download')[0],400)

    def test_secrets_are_not_written(self):
        p=self.payload('Credential handling');p['credentials']={'brain':'TEST_ONLY_SECRET_123'}
        p['config']['brain']['backend']='responses'
        ident=self.manager.launch(p);self.wait_done(ident)
        for file in self.manager.directory(ident).rglob('*'):
            if file.is_file():self.assertNotIn(b'TEST_ONLY_SECRET_123',file.read_bytes())
        for file in self.manager.state.glob(ident+'*'):
            self.assertNotIn(b'TEST_ONLY_SECRET_123',file.read_bytes())

    def test_restart_marks_interrupted(self):
        ident='web-interrupted-fixture';root=self.manager.directory(ident);root.mkdir()
        server.write(root/'report.json',{'status':'running'})
        server.write(self.manager.state/(ident+'.json'),{'title':'Interrupted','created':'2026-09-05T00:00:00Z','mode':'run'})
        self.assertEqual(self.manager.detail(ident)['report']['status'],'interrupted')

    def test_discovery_and_discovery_failure(self):
        import io
        with patch('server.urllib.request.urlopen',return_value=io.BytesIO(b'{"data":[{"id":"model-a"}]}')):
            status,_,body=self.request('POST','/api/models',{'base_url':'http://localhost:11434/v1'})
        self.assertEqual(status,200);self.assertEqual(json.loads(body)['models'],['model-a'])
        with patch('server.urllib.request.urlopen',side_effect=OSError()):
            self.assertEqual(self.request('POST','/api/models',{'base_url':'http://localhost:11434/v1'})[0],400)


if __name__=='__main__':unittest.main()
