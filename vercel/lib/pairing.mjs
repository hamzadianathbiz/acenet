import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {connectorToken} from './auth.mjs';

const TTL_MS = 10 * 60 * 1000;
const hash = value => createHash('sha256').update(value).digest('hex');
const json = (value, status = 200) => Response.json(value, {
  status, headers: {'Cache-Control': 'no-store'},
});

function publicOrigin() {
  const configured = process.env.ACENET_PUBLIC_ORIGIN || 'https://acenet-zeta.vercel.app';
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('The public app origin is not configured correctly.');
  }
  return url.origin;
}

async function limited(db, key, now, limit) {
  let rate = await db.get(key);
  if (!rate || rate.until <= now) rate = {count: 0, until: now + 60000};
  if (rate.count >= limit) return true;
  await db.put(key, {...rate, count: rate.count + 1});
  return false;
}

// The caller must hold acquire('pairing') for either mutation. The pairing
// namespace is separate from both account records and every user's run storage.
export async function issuePairing(db, user, now = Date.now()) {
  if (!user || (user.tenant !== '' && !/^[a-f0-9-]{36}$/.test(user.tenant || ''))) {
    return json({error: 'Sign in to your ACENET account.'}, 401);
  }
  if (await limited(db, 'issue-rate:' + hash(user.tenant || 'owner'), now, 6)) {
    return json({error: 'Too many pairing requests. Try again in a minute.'}, 429);
  }
  const code = randomBytes(12).toString('hex').toUpperCase();
  const expires = now + TTL_MS;
  await db.put('code:' + hash(code), {tenant: user.tenant, expires});
  return json({code, expires_at: new Date(expires).toISOString()});
}

export async function redeemPairing(db, input, trustedIp, now = Date.now()) {
  // Use only the hosting platform's trusted IP header at the call site. Missing
  // addresses share a bucket instead of allowing an attacker to choose one.
  if (await limited(db, 'redeem-rate:' + hash(trustedIp || 'unknown'), now, 10)) {
    return json({error: 'Too many pairing attempts. Try again in a minute.'}, 429);
  }
  const code = typeof input === 'string' && input.length <= 64
    ? input.replace(/[\s-]/g, '').toUpperCase() : '';
  const invalid = () => json({error: 'This pairing code is invalid or expired. Generate a new code in ACENET.'}, 400);
  if (!/^[A-F0-9]{24}$/.test(code)) return invalid();
  const key = 'code:' + hash(code);
  const row = await db.get(key);
  if (!row || row.consumed_at !== undefined || row.expires <= now ||
      (row.tenant !== '' && !/^[a-f0-9-]{36}$/.test(row.tenant || ''))) return invalid();

  const token = row.tenant === '' ? process.env.BRIDGE_TOKEN : connectorToken(row.tenant);
  if (!token) throw new Error('The workspace connector is not configured.');
  const config = {app: publicOrigin(), token, id: 'runner-' + randomUUID()};
  // Consume before returning credentials. An interrupted response requires a
  // newly issued code rather than allowing a credential response to be replayed.
  await db.put(key, {expires: row.expires, consumed_at: now});
  return json(config);
}
