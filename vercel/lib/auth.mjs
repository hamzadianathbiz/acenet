import {createHash,createHmac,randomBytes,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive),hash=v=>createHash('sha256').update(v).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const json=(v,status=200,headers={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
const secret=()=>{if(!process.env.STORAGE_KEY)throw new Error('Account signing is not configured');return process.env.STORAGE_KEY;};
const validEmail=v=>v.length<=254&&v.split('@')[0].length<=64&&/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(v)&&!v.startsWith('.')&&!v.split('@')[0].endsWith('.')&&!v.split('@')[0].includes('..');
const sign=v=>createHmac('sha256',secret()).update(v).digest('hex');
export function connectorToken(tenant){return 'v1.'+tenant+'.'+sign('connector:'+tenant);}
export function connectorTenant(token){if(process.env.BRIDGE_TOKEN&&equal(token,process.env.BRIDGE_TOKEN))return '';const m=/^v1\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token||'');return m&&equal(token,connectorToken(m[1]))?m[1]:null;}
export async function identity(request,db){const raw=request.headers.get('cookie')?.match(/(?:^|;\s*)acenet_user=([a-f0-9]{64})/)?.[1];if(!raw)return null;const row=await db.get('session:'+hash(raw));return row?.expires>Date.now()?{...row,key:'session:'+hash(raw)}:null;}
export async function authRoute(request,db,user,ip){const path=new URL(request.url).pathname;
 if(path==='/api/bootstrap')return json({locked:!user,token:user?.csrf||'',username:user?.username||'',email:user?.email||'',cloud:true});
 if(path==='/api/auth/logout'){if(!user)return json({error:'Sign in first'},401);await db.put(user.key,{expires:0});return json({ok:true},200,{'Set-Cookie':'acenet_user=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});}
 if(!['/api/auth/register','/api/auth/login','/api/setup'].includes(path))return null;
 const d=await request.json();const email=String(d.email||'').toLowerCase().trim(),legacy=path==='/api/auth/login'&&!email;const username=email||String(d.username||'').toLowerCase().trim();const password=String(d.password||'');
 if(password.length>256)return json({error:'Password is too long'},400);
 const rateKey='rate:'+hash(ip||'unknown');let rate=await db.get(rateKey);if(!rate||rate.until<Date.now())rate={count:0,until:Date.now()+60000};if(rate.count>=10)return json({error:'Too many attempts. Try again in a minute.'},429);await db.put(rateKey,{...rate,count:rate.count+1});
 let account;
 // The old workspace password remains an explicit owner-only login, never a signup default.
 if(path==='/api/setup'&& !username){if(!process.env.APP_PASSWORD||!equal(hash(password),hash(process.env.APP_PASSWORD)))return json({error:'Incorrect owner password'},401);account={tenant:'',username:'Workspace owner'};}
 else {if(legacy?!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(username):!validEmail(email))return json({error:legacy?'Enter your existing username.':'Enter a valid email address.'},400);
 const key='user:'+hash(username);account=await db.get(key);
 if(path==='/api/auth/register'){if(account)return json({error:'An account already exists with that email. Sign in instead.'},409);if(password.length<12)return json({error:'Use a password of at least 12 characters.'},400);const salt=randomBytes(16).toString('hex');account={tenant:crypto.randomUUID(),username:email,email,salt,password:Buffer.from(await scrypt(password,salt,64)).toString('hex')};await db.put(key,account);}
 else {const derived=Buffer.from(await scrypt(password,account?.salt||'invalid-account',64)).toString('hex');if(!account||!equal(derived,account.password))return json({error:'Incorrect sign-in details.'},401);}}
 const raw=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');await db.put('session:'+hash(raw),{tenant:account.tenant,username:account.username,email:account.email||'',csrf,expires:Date.now()+86400000});
 return json({token:csrf,username:account.username,email:account.email||''},200,{'Set-Cookie':`acenet_user=${raw}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`});
}
