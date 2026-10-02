import { createHash } from 'node:crypto';
import reminders from '../functions/reminders.js';
import delivery from '../functions/delivery.js';
import { accessToken, verifyUser, database, sendMessage, failure } from './firebase.mjs';

const { normalizePreferences, localDay, buildDigest } = reminders;
const { deliverDevice } = delivery;
const ROOT = 'cloudflarePushDevices';
const INTERVAL = 5 * 60000;
export const BATCH_SIZE = 2;
const MAX_AGE = 30 * 86400000;

function configured(env) {
  return Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_DATABASE_URL &&
    env.FIREBASE_WEB_API_KEY && env.FIREBASE_SERVICE_ACCOUNT && env.ALLOWED_ORIGINS);
}
function origins(env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
}
function response(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
      ...(origin ? { 'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type' } : {}),
    },
  });
}
async function readBody(request) {
  // Enforce the limit on streamed bytes as well as on Content-Length.
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    throw failure('invalid-request', 400);
  const reader = request.body?.getReader();
  if (!reader) throw failure('invalid-request', 400);
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw failure('request-too-large', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error();
    return data;
  } catch { throw failure('invalid-request', 400); }
}

function devicePayload(data, origin, now) {
  if (typeof data.token !== 'string' || data.token.length < 20 || data.token.length > 4096 ||
      typeof data.enabled !== 'boolean') throw failure('invalid-request', 400);
  if (!data.enabled) return {};
  let url;
  try {
    url = new URL(data.url);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password ||
        typeof data.timeZone !== 'string' || data.timeZone.length > 100) throw new Error();
    localDay(now, data.timeZone);
  } catch { throw failure('invalid-request', 400); }
  const snoozes = {};
  for (const [id, until] of Object.entries(data.snoozes || {}).slice(0, 1000)) {
    if (/^[a-zA-Z0-9_-]{1,100}$/.test(id) && Number.isFinite(until) && until > now)
      snoozes[id] = Math.min(until, now + MAX_AGE);
  }
  return { token: data.token, url: url.href, timeZone: data.timeZone,
    preferences: normalizePreferences(data.preferences || {}), snoozes };
}

// Dependency injection keeps tests offline, including authentication and scheduling tests.
export function createWorker(overrides = {}) {
  const deps = { accessToken, verifyUser, database, sendMessage, now: Date.now, ...overrides };
  return {
    async fetch(request, env) {
      const origin = request.headers.get('Origin');
      const allowed = origins(env).includes(origin) ? origin : null;
      if (new URL(request.url).pathname === '/health' && request.method === 'GET')
        return response({ configured: configured(env) }, configured(env) ? 200 : 503, allowed);
      if (new URL(request.url).pathname !== '/devices') return response({ error: 'not-found' }, 404, allowed);
      if (!allowed) return response({ error: 'origin-not-allowed' }, 403, null);
      if (request.method === 'OPTIONS') return response({}, 200, allowed);
      if (request.method !== 'POST') return response({ error: 'method-not-allowed' }, 405, allowed);
      try {
        if (!configured(env)) throw failure('backend-not-configured');
        const bearer = /^Bearer ([^\s]{1,8192})$/.exec(request.headers.get('Authorization') || '');
        if (!bearer) throw failure('unauthenticated', 401);
        const data = await readBody(request);
        const now = deps.now();
        const payload = devicePayload(data, allowed, now);
        const uid = await deps.verifyUser(bearer[1], env);
        const token = await deps.accessToken(env);
        const db = deps.database(env, token);
        const key = createHash('sha256').update(data.token).digest('hex');
        await db.ref(`${ROOT}/${key}`).transaction((current) => {
          if (current && current.uid !== uid) throw failure('device-conflict', 409);
          if (!data.enabled) return current ? null : undefined;
          return { ...current, ...payload, uid, updatedAt: now,
            revision: crypto.randomUUID(), nextCheckAt: current?.nextCheckAt ?? now };
        });
        return response({ enabled: data.enabled }, 200, allowed);
      } catch (error) {
        return response({ error: error.code || 'backend-unavailable' }, error.status || 503, allowed);
      }
    },
    async scheduled(_event, env) {
      if (!configured(env)) throw failure('backend-not-configured');
      const now = deps.now();
      const token = await deps.accessToken(env);
      const db = deps.database(env, token);
      // An indexed, bounded queue replaces the unbounded scan in the Firebase scheduler.
      const devices = await db.get(ROOT, { orderBy: 'nextCheckAt', endAt: now, limitToFirst: BATCH_SIZE }) || {};
      const tasksByUser = new Map();
      let failed = false;
      for (const [key, device] of Object.entries(devices)) {
        try {
          const ref = db.ref(`${ROOT}/${key}`);
          const claim = await ref.transaction((current) => {
            if (!current || current.revision !== device.revision || current.nextCheckAt > now) return;
            // Expire abandoned subscriptions; an app visit renews updatedAt.
            if (!current.uid || !current.token || current.updatedAt < now - MAX_AGE) return null;
            return { ...current, nextCheckAt: now + INTERVAL };
          });
          if (!claim.committed || !device.uid || !device.token || device.updatedAt < now - MAX_AGE) continue;
          if (!origins(env).includes(new URL(device.url).origin)) continue;
          if (!tasksByUser.has(device.uid))
            tasksByUser.set(device.uid, await db.get(`users/${encodeURIComponent(device.uid)}/tasks`));
          const digest = buildDigest(tasksByUser.get(device.uid), device, now);
          if (digest) await deliverDevice({ ref, device, digest, now,
            send: (message) => deps.sendMessage(message, env, token) });
        } catch (error) {
          failed = true;
          // Never log tokens, credentials, user IDs, or assignment contents.
          console.error('Reminder delivery failed', { code: error.code || 'backend-unavailable' });
        }
      }
      if (failed) throw failure('scheduled-delivery-failed');
    },
  };
}

export default createWorker();
