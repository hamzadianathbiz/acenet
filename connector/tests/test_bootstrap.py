import hashlib,os,subprocess,tempfile,unittest,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class BootstrapTests(unittest.TestCase):
 def run_installer(self,valid_hash=True,code='ABCD-EFGH-1234'):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);tools=root/'bin';tools.mkdir();archive=root/'fixture.zip';receipt=root/'receipt'
   with zipfile.ZipFile(archive,'w') as z:z.writestr('Start-ACENET.command','#!/bin/bash\nprintf "%s\\n" "$@" > "$ACENET_TEST_RECEIPT"\n')
   curl=tools/'curl';curl.write_text('#!/bin/bash\nwhile [[ $# -gt 0 ]]; do if [[ "$1" = -o ]]; then cp "$ACENET_TEST_ARCHIVE" "$2"; exit; fi; shift; done\nexit 1\n');curl.chmod(0o700)
   digest=hashlib.sha256(archive.read_bytes()).hexdigest() if valid_hash else '0'*64
   source=(ROOT/'install.sh').read_text().replace('__ACENET_ORIGIN__','https://fixture.invalid').replace('__ACENET_MAC_SHA256__',digest)
   script=root/'install.sh';script.write_text(source)
   env={**os.environ,'PATH':str(tools)+os.pathsep+os.environ['PATH'],'ACENET_TEST_ARCHIVE':str(archive),'ACENET_TEST_RECEIPT':str(receipt)}
   result=subprocess.run(['bash',str(script),code,'claude'],env=env,capture_output=True,text=True)
   return result,receipt.read_text().splitlines() if receipt.exists() else None
 def test_verified_download_forwards_code_and_provider_without_prompts(self):
  result,args=self.run_installer();self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(args,['--code','ABCD-EFGH-1234','--provider','claude'])
 def test_corrupted_download_never_runs_helper(self):
  result,args=self.run_installer(False);self.assertNotEqual(result.returncode,0);self.assertIsNone(args)
 def test_invalid_code_never_runs_helper(self):
  result,args=self.run_installer(code='bad;command');self.assertNotEqual(result.returncode,0);self.assertIsNone(args)
if __name__=='__main__':unittest.main()
