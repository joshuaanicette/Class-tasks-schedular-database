const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const modules = Promise.all([import('../worker/index.mjs'), import('../worker/firebase.mjs')]);
const now = Date.parse('2026-10-01T16:00:00Z');
const origin = 'https://scheduler.test';
const env = {
  FIREBASE_PROJECT_ID: 'test-project', FIREBASE_DATABASE_URL: 'https://test.firebaseio.com',
  FIREBASE_WEB_API_KEY: 'public-test-key', FIREBASE_SERVICE_ACCOUNT: 'test-secret', ALLOWED_ORIGINS: origin,
};
const payload = {
  token: 'a-valid-long-device-token', enabled: true, url: `${origin}/`, timeZone: 'America/New_York',
  preferences: { remindersOverdue: false }, snoozes: { valid: now + 60000, 'bad/key': now + 60000 },
};
const key = createHash('sha256').update(payload.token).digest('hex');
const path = `cloudflarePushDevices/${key}`;
function request(data = payload, options = {}) {
  return new Request('https://worker.test/devices', {
    method: 'POST', headers: { Origin: origin, Authorization: 'Bearer signed-token', 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(data),
  });
}
async function fixture() {
  const [{ createWorker, BATCH_SIZE }] = await modules;
  const records = new Map();
  const sent = [];
  const queries = [];
  let user = 'user-1';
  let authCalls = 0;
  let sendError;
  const db = {
    async get(location, query) {
      queries.push({ location, query });
      if (location === 'cloudflarePushDevices') {
        return Object.fromEntries([...records].filter(([p, d]) => p.startsWith('cloudflarePushDevices/') && d.nextCheckAt <= now)
          .sort((a, b) => a[1].nextCheckAt - b[1].nextCheckAt).slice(0, query.limitToFirst)
          .map(([p, d]) => [p.split('/')[1], structuredClone(d)]));
      }
      return records.get(location) || null;
    },
    ref(location) {
      return { async transaction(update) {
        const value = update(structuredClone(records.get(location) || null));
        if (value === undefined) return { committed: false };
        if (value === null) records.delete(location); else records.set(location, value);
        return { committed: true };
      } };
    },
  };
  const worker = createWorker({
    now: () => now,
    verifyUser: async (token) => { authCalls++; assert.equal(token, 'signed-token'); return user; },
    accessToken: async () => 'server-token', database: () => db,
    sendMessage: async (message) => { if (sendError) throw sendError; sent.push(message); },
  });
  return { worker, records, sent, queries, db, BATCH_SIZE, get authCalls() { return authCalls; },
    set user(value) { user = value; }, set sendError(value) { sendError = value; } };
}

test('registration uses verified identity, validates preferences and preserves delivery state', async () => {
  const f = await fixture();
  let result = await f.worker.fetch(request({ ...payload, uid: 'attacker-supplied' }), env);
  assert.equal(result.status, 200);
  assert.equal(f.records.get(path).uid, 'user-1');
  assert.deepEqual(f.records.get(path).snoozes, { valid: now + 60000 });
  assert.equal(f.records.get(path).preferences.remindersOverdue, false);
  const old = f.records.get(path).revision;
  f.records.get(path).lastKey = 'delivered-digest';
  result = await f.worker.fetch(request(payload), env);
  assert.equal(result.status, 200);
  assert.equal(f.records.get(path).lastKey, 'delivered-digest');
  assert.notEqual(f.records.get(path).revision, old);
});

test('missing auth, foreign origins, malformed and oversized requests cannot write devices', async () => {
  const f = await fixture();
  for (const [req, status] of [
    [request(payload, { headers: { Authorization: '' } }), 401],
    [request(payload, { headers: { Origin: 'https://evil.test' } }), 403],
    [request({ ...payload, url: 'https://evil.test/' }), 400],
    [request({ ...payload, timeZone: 'Invalid/Zone' }), 400],
    [request({ ...payload, token: 'short' }), 400],
    [request({ ...payload, enabled: 'true' }), 400],
    [request(null), 400],
    [request({ ...payload, extra: 'a'.repeat(65536) }), 413],
  ]) assert.equal((await f.worker.fetch(req, env)).status, status);
  assert.equal(f.authCalls, 0);
  assert.equal(f.records.size, 0);
});

test('preflight, setup health, and ownership checks do not expose device records', async () => {
  const f = await fixture();
  const preflight = await f.worker.fetch(new Request('https://worker.test/devices', { method: 'OPTIONS', headers: { Origin: origin } }), env);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await f.worker.fetch(request(), { ...env, FIREBASE_SERVICE_ACCOUNT: '' })).status, 503);
  const health = await f.worker.fetch(new Request('https://worker.test/health'), env);
  assert.deepEqual(await health.json(), { configured: true });
  await f.worker.fetch(request(), env);
  f.user = 'user-2';
  assert.equal((await f.worker.fetch(request(), env)).status, 409);
  assert.equal((await f.worker.fetch(request({ ...payload, enabled: false }), env)).status, 409);
  assert.equal(f.records.get(path).uid, 'user-1');
  f.user = 'user-1';
  assert.equal((await f.worker.fetch(request({ ...payload, enabled: false }), env)).status, 200);
  assert.equal(f.records.has(path), false);
});

test('scheduled delivery is bounded, reads current tasks, and suppresses duplicate digests', async () => {
  const f = await fixture();
  await f.worker.fetch(request(), env);
  f.records.set('users/user-1/tasks', {
    due: { id: 'due', title: 'Math homework', dueDate: '2026-10-01T23:00:00Z' },
    done: { id: 'done', completed: true, dueDate: '2026-10-01T23:00:00Z' },
  });
  await f.worker.scheduled({}, env);
  assert.equal(f.sent.length, 1);
  assert.match(f.sent[0].notification.body, /Math homework/);
  assert.doesNotMatch(f.sent[0].notification.body, /Plus/);
  assert.equal(f.queries[0].query.limitToFirst, f.BATCH_SIZE);
  assert.equal(f.records.get(path).nextCheckAt, now + 300000);
  assert.ok(f.records.get(path).lastKey);
  f.records.get(path).nextCheckAt = now;
  await f.worker.scheduled({}, env);
  assert.equal(f.sent.length, 1);
  f.records.get('users/user-1/tasks').due.completed = true;
  f.records.get(path).nextCheckAt = now;
  await f.worker.scheduled({}, env);
  assert.equal(f.sent.length, 1);
});

test('queue advances past idle devices, expires abandoned subscriptions, and caps each run', async () => {
  const f = await fixture();
  await f.worker.fetch(request(), env);
  const device = f.records.get(path);
  f.records.clear();
  for (let i = 0; i < 5; i++) f.records.set(`cloudflarePushDevices/${i}`, { ...device, nextCheckAt: now - 100 + i });
  await f.worker.scheduled({}, env);
  assert.equal([...f.records.values()].filter((d) => d.nextCheckAt > now).length, f.BATCH_SIZE);
  f.records.get('cloudflarePushDevices/2').updatedAt = now - 31 * 86400000;
  await f.worker.scheduled({}, env);
  assert.equal(f.records.has('cloudflarePushDevices/2'), false);
  assert.equal(f.records.get('cloudflarePushDevices/3').nextCheckAt, now + 300000);
});

test('transient FCM failures release leases; unregistered tokens are removed', async () => {
  const f = await fixture();
  await f.worker.fetch(request(), env);
  f.records.set('users/user-1/tasks', { due: { id: 'due', dueDate: '2026-10-01T23:00:00Z' } });
  f.sendError = Object.assign(new Error('temporary'), { code: 'messaging-unavailable' });
  await assert.rejects(f.worker.scheduled({}, env), /scheduled-delivery-failed/);
  assert.equal(f.records.get(path).lease, null);
  assert.equal(f.records.get(path).lastKey, undefined);
  f.records.get(path).nextCheckAt = now;
  f.sendError = Object.assign(new Error('expired'), { code: 'messaging/registration-token-not-registered' });
  await f.worker.scheduled({}, env);
  assert.equal(f.records.has(path), false);
});

test('preference changes during task loading invalidate the stale digest', async () => {
  const f = await fixture();
  await f.worker.fetch(request(), env);
  const original = f.db.get;
  f.db.get = async (location, query) => {
    if (location.startsWith('users/')) {
      f.records.get(path).revision = 'changed-during-read';
      return { due: { id: 'due', dueDate: '2026-10-01T23:00:00Z' } };
    }
    return original(location, query);
  };
  await f.worker.scheduled({}, env);
  assert.equal(f.sent.length, 0);
});

test('RTDB adapter uses ETags and retries conflicts without overwriting a concurrent change', async () => {
  const [, { database }] = await modules;
  const calls = [];
  const responses = [
    new Response(JSON.stringify({ count: 1 }), { headers: { ETag: 'v1' } }),
    new Response('{}', { status: 412 }),
    new Response(JSON.stringify({ count: 2 }), { headers: { ETag: 'v2' } }),
    new Response('{}'),
  ];
  const db = database(env, 'oauth-token', async (url, options) => { calls.push({ url, options }); return responses.shift(); });
  const result = await db.ref('cloudflarePushDevices/test').transaction((d) => ({ count: d.count + 1 }));
  assert.equal(result.committed, true);
  assert.equal(calls[1].options.headers['If-Match'], 'v1');
  assert.equal(calls[3].options.headers['If-Match'], 'v2');
  assert.equal(JSON.parse(calls[3].options.body).count, 3);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer oauth-token');
});

test('Firebase validates the ID token and rejects expired or disabled accounts', async () => {
  const [, { verifyUser }] = await modules;
  const signed = 'header.' + Buffer.from(JSON.stringify({ aud: env.FIREBASE_PROJECT_ID, iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, sub: 'verified-user' })).toString('base64url') + '.signature';
  const ok = await verifyUser(signed, env, async (url, options) => {
    assert.equal(new URL(url).searchParams.get('key'), env.FIREBASE_WEB_API_KEY);
    assert.equal(JSON.parse(options.body).idToken, signed);
    return Response.json({ users: [{ localId: 'verified-user' }] });
  });
  assert.equal(ok, 'verified-user');
  await assert.rejects(verifyUser(signed, { ...env, FIREBASE_PROJECT_ID: 'other-project' }, async () => Response.json({ users: [{ localId: 'verified-user' }] })), /unauthenticated/);
  await assert.rejects(verifyUser('expired', env, async () => Response.json({ error: { message: 'INVALID_ID_TOKEN' } }, { status: 400 })), /unauthenticated/);
  await assert.rejects(verifyUser('disabled', env, async () => Response.json({ users: [{ localId: 'u', disabled: true }] })), /unauthenticated/);
});

test('FCM REST payload uses fcm_options and only prunes confirmed unregistered tokens', async () => {
  const [, { sendMessage }] = await modules;
  const message = { token: 'device-token', notification: { title: 'Reminder', body: 'Due' }, webpush: { fcmOptions: { link: `${origin}/` }, headers: { TTL: '3600' } } };
  await sendMessage(message, env, 'oauth', async (_url, options) => {
    const wire = JSON.parse(options.body).message;
    assert.deepEqual(wire.webpush.fcm_options, { link: `${origin}/` });
    assert.equal(wire.webpush.fcmOptions, undefined);
    return Response.json({ name: 'sent' });
  });
  await assert.rejects(sendMessage(message, env, 'oauth', async () => Response.json({ error: { status: 'INVALID_ARGUMENT' } }, { status: 400 })), /messaging-unavailable/);
  await assert.rejects(sendMessage(message, env, 'oauth', async () => Response.json({ error: { details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }] } }, { status: 404 })), /registration-token-not-registered/);
});

test('service account OAuth assertions are signed, project-bound, and cached', async () => {
  const [, { accessToken }] = await modules;
  const { generateKeyPairSync, verify } = require('node:crypto');
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { project_id: env.FIREBASE_PROJECT_ID, client_email: 'test@test.iam.gserviceaccount.com', private_key: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const config = { ...env, FIREBASE_SERVICE_ACCOUNT: JSON.stringify(account) };
  let calls = 0;
  const fetcher = async (_url, options) => {
    calls++;
    const [header, payload, signature] = options.body.get('assertion').split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url'));
    assert.equal(claims.iss, account.client_email);
    assert.ok(claims.scope.includes('firebase.messaging'));
    assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), pair.publicKey, Buffer.from(signature, 'base64url')), true);
    return Response.json({ access_token: 'cached-oauth', expires_in: 3600 });
  };
  assert.equal(await accessToken(config, fetcher), 'cached-oauth');
  assert.equal(await accessToken(config, fetcher), 'cached-oauth');
  assert.equal(calls, 1);
  await assert.rejects(accessToken({ ...config, FIREBASE_PROJECT_ID: 'other-project' }, fetcher), /backend-not-configured/);
});
