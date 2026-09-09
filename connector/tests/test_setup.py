import io,json,os,plistlib,sys,tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch,Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import setup as installer
from bridge import runner_lock,stop_job,retry_delay
class Tests(unittest.TestCase):
 def test_packaged_installer_copies_all_runtime_and_imports(self):
  import subprocess,zipfile
  repo=Path(__file__).resolve().parents[2]
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);bundle=d/'bundle';installed=d/'installed';installed.mkdir()
   subprocess.run([sys.executable,str(repo/'connector/package.py'),'--output',str(d)],check=True)
   with zipfile.ZipFile(d/'acenet-mac.zip') as z:z.extractall(bundle)
   installer.install_runtime(bundle,installed)
   (installed/'config.json').write_text('private pairing remains')
   installer.install_runtime(bundle,installed)
   self.assertEqual((installed/'config.json').read_text(),'private pairing remains')
   subprocess.run([sys.executable,'-c','import bridge,economy,orchestrator,permissions,openrouter_inference; from pathlib import Path; assert Path("model-instructions.md").is_file()'],cwd=installed,check=True)
 def test_incomplete_bundle_does_not_replace_installation(self):
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);source=d/'source';root=d/'installed';source.mkdir();root.mkdir()
   (root/'bridge.py').write_text('existing');(source/'bridge.py').write_text('replacement')
   with self.assertRaisesRegex(RuntimeError,'Incomplete helper'):installer.install_runtime(source,root)
   self.assertEqual((root/'bridge.py').read_text(),'existing')
 def test_missing_module_error_is_actionable_without_raw_log(self):
  from bridge import stopped_job_error
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'job.log';p.write_text("private path secret\nModuleNotFoundError: No module named 'economy'")
   message=stopped_job_error(p);self.assertIn('Set up on this computer',message);self.assertNotIn('secret',message)
 def test_storage_outage_backoff_respects_server_and_bounds(self):
  self.assertEqual(retry_delay(urllib.error.HTTPError('url',503,'busy',{'Retry-After':'900'},None)),900)
  self.assertEqual(retry_delay(OSError(),4),120)
  self.assertEqual(retry_delay(OSError(),100),900)
  self.assertEqual(retry_delay(urllib.error.HTTPError('url',503,'busy',{'Retry-After':'invalid'},None)),15)
 def test_redeem_sends_only_code_and_rejects_untrusted_origin(self):
  config={'app':installer.APP,'token':'private-test','id':'test'}
  opener=Mock(side_effect=lambda req,timeout:io.BytesIO(json.dumps(config).encode()))
  self.assertEqual(installer.redeem('ABCD',opener),config)
  request=opener.call_args.args[0]
  self.assertEqual(json.loads(request.data),{'code':'ABCD'});self.assertNotIn('Authorization',request.headers)
  config['app']='https://attacker.test'
  with self.assertRaises(ValueError):installer.redeem('ABCD',opener)
 def test_used_or_expired_pair_code_does_not_expose_server_body(self):
  opener=Mock(side_effect=urllib.error.HTTPError('url',400,'expired',{},None))
  with self.assertRaisesRegex(RuntimeError,'Create a new connection code'):installer.redeem('ABCD',opener)
 def test_macos_service_uses_absolute_paths_and_private_config(self):
  with tempfile.TemporaryDirectory() as d,patch('setup.sys.platform','darwin'),patch('setup.Path.home',return_value=Path(d)),patch('setup.subprocess.run') as run,patch('setup.executable',return_value='/test/bin/codex'):
   root=Path(d)/'Application Support'/'ACENET';root.mkdir(parents=True)
   installer.start_runner(root)
   file=Path(d)/'Library'/'LaunchAgents'/'com.ace.acenet.plist';data=plistlib.loads(file.read_bytes())
   self.assertEqual(data['ProgramArguments'][-1],str(root/'config.json'));self.assertTrue(data['RunAtLoad']);self.assertEqual(file.stat().st_mode&0o777,0o600)
   self.assertEqual(run.call_args.args[0][:2],['launchctl','bootstrap'])
 def test_duplicate_runner_is_blocked_and_lock_releases(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'.runner.lock';first=runner_lock(path);self.assertIsNotNone(first);self.assertIsNone(runner_lock(path));first.close();second=runner_lock(path);self.assertIsNotNone(second);second.close()
 def test_windows_cancellation_targets_only_owned_process_tree(self):
  proc=Mock(pid=12345);proc.poll.return_value=None
  with patch('bridge.sys.platform','win32'),patch('bridge.subprocess.run') as run:
   stop_job(proc);self.assertEqual(run.call_args.args[0],['taskkill','/PID','12345','/T','/F']);proc.wait.assert_called_once_with(timeout=10)
if __name__=='__main__':unittest.main()
