import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {issuePairing, redeemPairing} from '../lib/pairing.mjs';
import {connectorTenant} from '../lib/auth.mjs';

process.env.STORAGE_KEY = 'pairing-test-signing-key';
process.env.BRIDGE_TOKEN = 'pairing-test-owner-token';
delete process.env.ACENET_PUBLIC_ORIGIN;
const alice = {tenant: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'};
const bob = {tenant: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'};
const time = Date.parse('2026-09-06T00:00:00Z');
class MemoryStorage {
  rows = new Map();
  async get(key) { return structuredClone(this.rows.get(key)); }
  async put(key, value) { this.rows.set(key, structuredClone(value)); }
}
async function issue(db, user = alice, now = time) {
  const response = await issuePairing(db, user, now);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}

test('codes are random, hashed at rest, expire in ten minutes, and issue no credentials', async () => {
  const db = new MemoryStorage();
  const first = await issue(db), second = await issue(db);
  assert.match(first.code, /^[A-F0-9]{24}$/);
  assert.notEqual(first.code, second.code);
  assert.equal(Date.parse(first.expires_at), time + 600000);
  assert.equal(first.token, undefined);
  assert.equal(JSON.stringify([...db.rows]).includes(first.code), false);
  assert.equal(JSON.stringify([...db.rows]).includes(process.env.BRIDGE_TOKEN), false);
  const record = db.rows.get('code:' + createHash('sha256').update(first.code).digest('hex'));
  assert.deepEqual(record, {tenant: alice.tenant, expires: time + 600000});
  assert.equal((await issuePairing(db, null, time)).status, 401);
});

test('redemption binds the original account, accepts readable formatting, and prevents replay', async () => {
  const db = new MemoryStorage();
  const a = await issue(db), b = await issue(db, bob);
  const formatted = a.code.toLowerCase().match(/.{1,4}/g).join('-');
  const response = await redeemPairing(db, formatted, '192.0.2.1', time + 1);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const config = await response.json();
  assert.equal(config.app, 'https://acenet-zeta.vercel.app');
  assert.equal(connectorTenant(config.token), alice.tenant);
  assert.match(config.id, /^runner-[a-f0-9-]{36}$/);
  const otherConfig = await (await redeemPairing(db, b.code, '192.0.2.2', time + 1)).json();
  assert.equal(connectorTenant(otherConfig.token), bob.tenant);
  assert.notEqual(config.token, otherConfig.token);
  assert.equal((await redeemPairing(db, a.code, '192.0.2.1', time + 2)).status, 400);
  assert.equal(JSON.stringify([...db.rows]).includes(config.token), false);
});

test('expired, absent, malformed and consumed codes share one generic failure', async () => {
  const db = new MemoryStorage();
  const issued = await issue(db);
  const responses = await Promise.all([
    redeemPairing(db, issued.code, '192.0.2.3', time + 600000),
    redeemPairing(db, '0'.repeat(24), '192.0.2.4', time + 1),
    redeemPairing(db, '', '192.0.2.5', time + 1),
    redeemPairing(db, {code: issued.code}, '192.0.2.6', time + 1),
    redeemPairing(db, 'a'.repeat(65), '192.0.2.7', time + 1),
  ]);
  for (const response of responses) assert.equal(response.status, 400);
  const bodies = await Promise.all(responses.map(response => response.json()));
  for (const body of bodies) assert.deepEqual(body, bodies[0]);
});

test('owner redemption preserves only the existing owner bridge token', async () => {
  const db = new MemoryStorage();
  const issued = await issue(db, {tenant: ''});
  const config = await (await redeemPairing(db, issued.code, '192.0.2.8', time)).json();
  assert.equal(config.token, process.env.BRIDGE_TOKEN);
  assert.equal(connectorTenant(config.token), '');
});

test('trusted-IP attempt limits block brute force without consuming a valid code', async () => {
  const db = new MemoryStorage();
  const issued = await issue(db);
  for (let i = 0; i < 10; i++) assert.equal((await redeemPairing(db, 'wrong', '192.0.2.9', time)).status, 400);
  assert.equal((await redeemPairing(db, issued.code, '192.0.2.9', time)).status, 429);
  assert.equal((await redeemPairing(db, issued.code, '192.0.2.9', time + 60000)).status, 200);
  const unknown = new MemoryStorage();
  for (let i = 0; i < 10; i++) await redeemPairing(unknown, 'wrong', '', time);
  assert.equal((await redeemPairing(unknown, 'wrong', undefined, time)).status, 429);
});

test('authenticated issuance has its own per-account limit', async () => {
  const db = new MemoryStorage();
  for (let i = 0; i < 6; i++) await issue(db);
  assert.equal((await issuePairing(db, alice, time)).status, 429);
  await issue(db, bob);
  await issue(db, alice, time + 60000);
});

test('an invalid deployment origin never consumes the code or returns a credential', async () => {
  const db = new MemoryStorage();
  const issued = await issue(db);
  process.env.ACENET_PUBLIC_ORIGIN = 'https://example.test/untrusted-path';
  try { await assert.rejects(redeemPairing(db, issued.code, '192.0.2.10', time), /public app origin/); }
  finally { delete process.env.ACENET_PUBLIC_ORIGIN; }
  assert.equal((await redeemPairing(db, issued.code, '192.0.2.10', time)).status, 200);
});
