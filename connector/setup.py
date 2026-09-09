#!/usr/bin/env python3
"""Interactive, per-user installation. Never reads native provider credentials."""
import argparse,json,os,platform,plistlib,shutil,subprocess,sys,time,urllib.request,urllib.error,webbrowser
from pathlib import Path
APP='https://ace-acenet.pages.dev'

def data_dir():
 if sys.platform=='win32':return Path(os.environ['LOCALAPPDATA'])/'ACENET'
 if sys.platform=='darwin':return Path.home()/'Library'/'Application Support'/'ACENET'
 return Path.home()/'.local'/'share'/'acenet'

def executable(name):
 found=shutil.which(name)
 if found:return found
 candidates=[Path.home()/'.local'/'bin'/name,Path.home()/'.local'/'bin'/(name+'.exe')]
 if sys.platform=='win32':candidates.append(Path(os.environ['LOCALAPPDATA'])/'Programs'/'OpenAI'/'Codex'/'bin'/(name+'.exe'))
 return next((str(p) for p in candidates if p.is_file()),None)

def redeem(code,opener=urllib.request.urlopen):
 request=urllib.request.Request(APP+'/api/pair/redeem',data=json.dumps({'code':code}).encode(),headers={'Content-Type':'application/json','User-Agent':'ACENET/1.0'},method='POST')
 for attempt in range(4):
  try:
   with opener(request,timeout=35) as r:config=json.load(r)
   if config.get('app')!=APP or not isinstance(config.get('token'),str) or not config['token']:raise ValueError('Invalid pairing response')
   return config
  except urllib.error.HTTPError as e:
   if e.code==409 and attempt<3:time.sleep(2);continue
   raise RuntimeError('Pairing failed. Create a new connection code in ACENET and try again.') from None

def install_provider(provider):
 name='codex' if provider=='chatgpt' else 'claude'
 if executable(name):return executable(name)
 print('Installing the official '+name+' app for your user account…',flush=True)
 if sys.platform=='win32':
  url='https://chatgpt.com/codex/install.ps1' if name=='codex' else 'https://claude.ai/install.ps1'
  subprocess.run(['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-Command',"$ErrorActionPreference='Stop'; irm '"+url+"' | iex"],check=True)
 else:
  url='https://chatgpt.com/codex/install.sh' if name=='codex' else 'https://claude.ai/install.sh'
  # Execute the published installer without modifying the native binary or auth methods.
  with urllib.request.urlopen(url,timeout=60) as r:script=r.read().decode()
  subprocess.run(['sh' if name=='codex' else 'bash'],input=script,text=True,check=True)
 path=executable(name)
 if not path:raise RuntimeError('The provider installer finished, but its app was not found. Reopen this helper to try again.')
 return path

def start_runner(root,autostart=True):
 py=str(Path(sys.executable).resolve());bridge=str(root/'bridge.py');config=str(root/'config.json')
 path=os.pathsep.join([str(Path.home()/'.local'/'bin'),str(Path(executable('codex') or py).parent),str(Path(executable('claude') or py).parent),os.environ.get('PATH','')])
 env={**os.environ,'PATH':path}
 if sys.platform=='darwin' and autostart:
  target=Path.home()/'Library'/'LaunchAgents'/'com.ace.acenet.plist';target.parent.mkdir(parents=True,exist_ok=True)
  data={'Label':'com.ace.acenet','ProgramArguments':[py,bridge,'--config',config],'RunAtLoad':True,'KeepAlive':True,'WorkingDirectory':str(root),'EnvironmentVariables':{'PATH':path},'StandardOutPath':str(root/'runner.log'),'StandardErrorPath':str(root/'runner.log')}
  target.write_bytes(plistlib.dumps(data));target.chmod(0o600)
  domain='gui/'+str(os.getuid());subprocess.run(['launchctl','bootout',domain,str(target)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  subprocess.run(['launchctl','bootstrap',domain,str(target)],check=True);return
 if sys.platform=='win32' and autostart:
  startup=Path(os.environ['APPDATA'])/'Microsoft'/'Windows'/'Start Menu'/'Programs'/'Startup';startup.mkdir(parents=True,exist_ok=True)
  pyw=str(Path(py).with_name('pythonw.exe'))
  if not Path(pyw).exists():pyw=py
  # Values derive from OS paths, not browser input. Escape CMD expansion characters.
  quote=lambda v:v.replace('%','%%').replace('"','')
  (startup/'ACENET.cmd').write_text('@echo off\r\nset "PATH='+quote(path)+'"\r\nstart "" "'+quote(pyw)+'" "'+quote(bridge)+'" --config "'+quote(config)+'"\r\n')
 log=(root/'runner.log').open('a')
 subprocess.Popen([py,bridge,'--config',config],env=env,stdout=log,stderr=log,start_new_session=sys.platform!='win32',**({'creationflags':0x08000000|0x00000008} if sys.platform=='win32' else {}));log.close()

RUNTIME_FILES=('orchestrator.py','bridge.py','harness.py','economy.py','permissions.py','model-instructions.md','local_models.py','local_inference.py','openrouter_inference.py')

def install_runtime(source_dir,root):
 # Validate the complete release before replacing any installed file.
 missing=[name for name in RUNTIME_FILES if not (source_dir/name).is_file()]
 if missing:raise RuntimeError('Incomplete helper download. Run setup again. Missing: '+', '.join(missing))
 for name in RUNTIME_FILES:
  if (source_dir/name).resolve()!=(root/name).resolve():shutil.copyfile(source_dir/name,root/name)

def main():
 p=argparse.ArgumentParser();p.add_argument('--provider',choices=['chatgpt','claude']);p.add_argument('--code');p.add_argument('--no-autostart',action='store_true');a=p.parse_args()
 print('\nACENET · Connect your subscription\n')
 print('This helper installs the official provider app if needed and starts your private runner at login.')
 print('Your provider login stays in its official app. Your computer must stay awake for tasks to run.\n')
 provider=a.provider
 if not provider:
  choice=input('Connect [1] ChatGPT or [2] Claude preview? [1]: ').strip();provider='claude' if choice=='2' else 'chatgpt'
 if provider=='claude':print('Claude is preview. Turn off extra usage in your Claude account to avoid overage charges. Terms: https://code.claude.com/docs/en/legal-and-compliance')
 code=a.code or input('\nPaste the connection code shown in ACENET: ').strip()
 config=redeem(code)
 root=data_dir();root.mkdir(parents=True,exist_ok=True)
 if sys.platform!='win32':root.chmod(0o700)
 install_runtime(Path(__file__).resolve().parent,root)
 configpath=root/'config.json';configpath.write_text(json.dumps(config));configpath.chmod(0o600)
 binary=install_provider(provider)
 os.environ['PATH']=str(Path(binary).parent)+os.pathsep+os.environ.get('PATH','')
 sys.path.insert(0,str(root));from bridge import chatgpt_login,claude_login
 signed_in=chatgpt_login() if provider=='chatgpt' else claude_login()
 if not signed_in:
  print('\nComplete sign-in in the official provider window.\n',flush=True)
  subprocess.run([binary,'login'] if provider=='chatgpt' else [binary,'auth','login'],check=True)
 if not (chatgpt_login() if provider=='chatgpt' else claude_login()):raise RuntimeError('A subscription login was not detected. Sign into the provider with your subscription and reopen this helper.')
 start_runner(root,not a.no_autostart)
 print('\nConnected. You can close this window and return to ACENET.\n')
 webbrowser.open(APP)
if __name__=='__main__':
 try:main()
 except (Exception,KeyboardInterrupt) as e:print('\nSetup stopped: '+str(e)+'\nReopen the helper with a new ACENET pairing code to try again.');sys.exit(1)
