import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/styles.css':['styles.css','text/css'],'/ace-tokens.css':['ace-tokens.css','text/css'],'/assets/ace-mark.png':['assets/ace-mark.png','image/png']};
const assets={};for(const [route,[file,type]] of Object.entries(files))assets[route]={type,data:(await readFile(new URL('../../app/public/'+file,import.meta.url))).toString('base64')};
await writeFile(new URL('../src/assets.generated.mjs',import.meta.url),'export const assets='+JSON.stringify(assets)+';\n');
await mkdir(new URL('../.wrangler/bundle/',import.meta.url),{recursive:true});
await build({entryPoints:[fileURLToPath(new URL('../src/index.js',import.meta.url))],bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers'],outfile:fileURLToPath(new URL('../.wrangler/bundle/worker.js',import.meta.url))});
