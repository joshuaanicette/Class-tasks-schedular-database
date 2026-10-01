const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
}
function boot(t, overrides = {}) {
  const dom = new JSDOM('<div class="reminder-settings"></div>', {
    url: 'https://scheduler.test/',
    runScripts: 'outside-only',
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  const calls = [];
  let permissionCalls = 0;
  let deleted = 0;
  const notifications = [];
  const reg = { active: {}, showNotification: async (...args) => notifications.push(args) };
  w.isSecureContext = true;
  w.PushManager = function () {};
  w.Notification = {
    permission: overrides.permission || 'default',
    requestPermission: async () => {
      permissionCalls++;
      return overrides.permission || 'granted';
    },
  };
  Object.defineProperty(w.navigator, 'serviceWorker', { value: { register: async () => reg } });
  if (overrides.ios) Object.defineProperty(w.navigator, 'userAgent', { value: 'iPhone' });
  w.SchedulerPushConfig = { vapidKey: overrides.missingKey ? '' : 'test-public-key' };
  w.firebaseAuth = {
    currentUser: overrides.guest ? null : { uid: 'user-1' },
    onAuthStateChanged: () => {},
  };
  w.taskScheduler = { loadReminderSettings: () => ({ remindersOverdue: false }) };
  const messaging = {
    getToken: async () => 'test-token-long-enough',
    deleteToken: async () => {
      deleted++;
    },
    onMessage: () => () => {},
  };
  w.firebase = {
    messaging: Object.assign(() => messaging, { isSupported: async () => true }),
    functions: () => {},
    app: () => ({
      functions: () => ({
        httpsCallable: () => async (data) => {
          if (overrides.serverFailure)
            throw Object.assign(new Error('offline'), { code: 'unavailable' });
          calls.push(data);
          return { data: { enabled: data.enabled } };
        },
      }),
    }),
  };
  let init;
  w.SchedulerFeatures = {
    register: (_, fn) => {
      init = fn;
    },
  };
  w.eval(fs.readFileSync('src/services/push.js', 'utf8'));
  init();
  return {
    w,
    calls,
    notifications,
    enable: async () => {
      w.document.getElementById('enableBackgroundReminders').click();
      await settle();
    },
    get permissionCalls() {
      return permissionCalls;
    },
    get deleted() {
      return deleted;
    },
  };
}

test('user tap registers device and preferences only after permission is granted', async (t) => {
  const app = boot(t);
  await app.enable();
  assert.equal(app.permissionCalls, 1);
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].preferences.remindersOverdue, false);
  assert.equal(app.calls[0].url, 'https://scheduler.test/');
  assert.equal(app.w.SchedulerPush.active, true);
  assert.match(
    app.w.document.getElementById('backgroundReminderStatus').textContent,
    /enabled on this device/,
  );
});
test('denied permission, guest mode, missing setup and uninstalled iOS never register', async (t) => {
  for (const options of [
    { permission: 'denied' },
    { guest: true },
    { missingKey: true },
    { ios: true },
  ]) {
    const app = boot(t, options);
    await app.enable();
    assert.equal(app.calls.length, 0);
    assert.equal(app.w.SchedulerPush.active, false);
    if (options.ios)
      assert.match(
        app.w.document.getElementById('backgroundReminderStatus').textContent,
        /Add to Home Screen/,
      );
  }
});
test('server registration failure does not falsely report background delivery enabled', async (t) => {
  const app = boot(t, { serverFailure: true });
  await app.enable();
  assert.equal(app.w.SchedulerPush.active, false);
  assert.equal(app.w.localStorage.getItem('schedulerPushDevice'), null);
  assert.match(
    app.w.document.getElementById('backgroundReminderStatus').textContent,
    /Could not connect/,
  );
});
test('disable removes the server registration and token before clearing device consent', async (t) => {
  const app = boot(t);
  await app.enable();
  await app.w.SchedulerPush.disable();
  assert.equal(app.calls.at(-1).enabled, false);
  assert.equal(app.deleted, 1);
  assert.equal(app.w.localStorage.getItem('schedulerPushDevice'), null);
  assert.equal(app.w.SchedulerPush.active, false);
});
test('mobile local alerts use the service worker notification API', async (t) => {
  const app = boot(t);
  await app.w.SchedulerPush.showLocal('Reminder', { body: 'Due today' });
  assert.equal(app.notifications[0][0], 'Reminder');
});
