from pathlib import Path
import zipfile,argparse
from urllib.parse import urlparse
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=root/'vercel/public');parser.add_argument('--app',default='https://ace-acenet.pages.dev');args=parser.parse_args()
url=urlparse(args.app)
if url.scheme!='https' or not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ('','/'):parser.error('App must be an HTTPS origin')
app=args.app.rstrip('/');args.output.mkdir(parents=True,exist_ok=True)
common={'economy.py':root/'harness/economy.py','permissions.py':root/'connector/permissions.py','model-instructions.md':root/'connector/model-instructions.md','bridge.py':root/'connector/bridge.py','harness.py':root/'harness/harness.py','setup.py':root/'connector/setup.py','local_models.py':root/'connector/local_models.py','local_inference.py':root/'connector/local_inference.py','openrouter_inference.py':root/'connector/openrouter_inference.py'}
readme='ACENET connection helper\n\nUnzip this folder. Open Start-ACENET.command on Mac or Start-ACENET.cmd on Windows. Paste the temporary connection code from your own ACENET account, then sign into the official provider app. No API key or config download is needed.\n\nAfter connecting, open Models in ACENET to select an installed Ollama or LM Studio model. Ollama users can choose Download & use for a starter model. Keep the local model app running.\n\nThe helper installs uv and a managed Python runtime if needed, installs the official provider app if missing, and starts your runner at login. Provider credentials remain in the official app. Your computer must stay awake while tasks run.\n\nClaude and Windows setup are preview. Claude extra usage follows your provider settings. Review https://code.claude.com/docs/en/legal-and-compliance.\n'
for bundle,launchers in [('acenet-mac.zip',['Start-ACENET.command']),('acenet-windows.zip',['Start-ACENET.cmd','Start-ACENET.ps1']),('acenet-connector.zip',['Start-ACENET.command','Start-ACENET.cmd','Start-ACENET.ps1'])]:
 with zipfile.ZipFile(args.output/bundle,'w',zipfile.ZIP_DEFLATED) as z:
  for name,path in common.items():
   if name=='setup.py':
    source=path.read_text();original="APP='https://ace-acenet.pages.dev'";assert source.count(original)==1
    z.writestr(name,source.replace(original,'APP='+repr(app)))
   else:z.write(path,name)
  for name in launchers:z.write(root/'connector'/name,name)
  z.writestr('README.txt',readme+'\nYour ACENET app: '+app+'\n')

# Public bootstrap scripts pin their matching helper bundle and never contain credentials.
import hashlib
for name,placeholder,bundle in [('install.sh','__ACENET_MAC_SHA256__','acenet-mac.zip'),('install.ps1','__ACENET_WINDOWS_SHA256__','acenet-windows.zip')]:
 source=(root/'connector'/name).read_text()
 digest=hashlib.sha256((args.output/bundle).read_bytes()).hexdigest()
 (args.output/name).write_text(source.replace('__ACENET_ORIGIN__',app).replace(placeholder,digest))
