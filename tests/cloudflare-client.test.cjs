const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function boot(options = {}) {
  const elements = new Map();
  function element() {
    return { textContent: '', disabled: false, handlers: {}, appendChild() {},
      addEventListener(name, fn) { this.handlers[name] = fn; } };
  }
  const storage = new Map();
  const calls = [];
  let permissions = 0;
  let deleted = 0;
  let init;
  let onAuth;
  const reg = { active: {}, showNotification: async () => {} };
  const messaging = { getToken: async () => 'valid-device-token-long',
    deleteToken: async () => { deleted++; }, onMessage: () => () => {} };
  const ctx = {
    URL, AbortController, setTimeout, clearTimeout, Intl, console,
    document: {
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
      querySelector: () => element(), createElement: () => element(),
    },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    navigator: { userAgent: 'Chrome', serviceWorker: { register: async () => reg } },
    Notification: { permission: 'granted', requestPermission: async () => { permissions++; return 'granted'; } },
    PushManager() {}, isSecureContext: true, location: { href: 'https://scheduler.test/' }, addEventListener() {},
    SchedulerPushConfig: { provider: 'cloudflare', workerUrl: options.missingUrl ? '' : 'https://worker.test', vapidKey: 'public-key' },
    firebaseAuth: { currentUser: { uid: 'user-1', getIdToken: async () => 'signed-firebase-id-token' }, onAuthStateChanged: (fn) => { onAuth = fn; } },
    firebase: { messaging: Object.assign(() => messaging, { isSupported: async () => true }), app() { throw new Error('Must not call Firebase Functions'); } },
    taskScheduler: { loadReminderSettings: () => ({ remindersOverdue: false }) },
    SchedulerFeatures: { register: (_, fn) => { init = fn; } },
    fetch: async (url, request) => {
      calls.push({ url: String(url), ...request });
      if (options.networkError) throw new TypeError('network failed');
      if (options.error) return Response.json({ error: options.error }, { status: options.status || 503 });
      if (options.invalidResponse) return new Response('<html>wrong site</html>');
      return Response.json({ enabled: JSON.parse(request.body).enabled });
    },
  };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync('src/services/push.js', 'utf8'), ctx);
  init();
  return { ctx, calls, storage, get permissions() { return permissions; }, get deleted() { return deleted; },
    get status() { return elements.get('backgroundReminderStatus').textContent; },
    enable: () => elements.get('enableBackgroundReminders').handlers.click(),
    restore: () => onAuth(ctx.firebaseAuth.currentUser) };
}

test('Cloudflare client registers, syncs preferences and disables using a Firebase ID token', async () => {
  const app = boot();
  await app.enable();
  assert.equal(app.permissions, 1);
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].url, 'https://worker.test/devices');
  assert.equal(app.calls[0].headers.Authorization, 'Bearer signed-firebase-id-token');
  assert.equal(JSON.parse(app.calls[0].body).preferences.remindersOverdue, false);
  assert.equal(app.ctx.SchedulerPush.active, true);
  assert.match(app.status, /enabled on this device/);
  await app.ctx.SchedulerPush.syncPreferences();
  assert.equal(app.calls.length, 2);
  await app.ctx.SchedulerPush.disable();
  assert.equal(JSON.parse(app.calls[2].body).enabled, false);
  assert.equal(app.ctx.SchedulerPush.active, false);
  assert.equal(app.deleted, 1);
  assert.equal(app.storage.has('schedulerPushDevice'), false);
});

test('missing Worker URL stops before requesting notification permission', async () => {
  const app = boot({ missingUrl: true });
  await app.enable();
  assert.equal(app.permissions, 0);
  assert.equal(app.calls.length, 0);
  assert.match(app.status, /site owner must connect/);
});

test('failed Worker registration never reports success and gives actionable errors', async () => {
  for (const [options, message] of [
    [{ error: 'backend-not-configured' }, /server configuration/],
    [{ error: 'backend-credentials' }, /server credentials/],
    [{ error: 'unauthenticated', status: 401 }, /sign-in expired/],
    [{ error: 'origin-not-allowed', status: 403 }, /website address/],
    [{ networkError: true }, /Could not connect/],
    [{ invalidResponse: true }, /unexpected response/],
  ]) {
    const app = boot(options);
    await app.enable();
    assert.equal(app.ctx.SchedulerPush.active, false);
    assert.equal(app.storage.has('schedulerPushDevice'), false);
    assert.match(app.status, message);
  }
});

test('restoring a stored device reconnects through the Worker without another permission prompt', async () => {
  const app = boot();
  await app.enable();
  await app.restore();
  assert.equal(app.calls.length, 2);
  assert.equal(app.permissions, 1);
  assert.equal(app.ctx.SchedulerPush.active, true);
});
