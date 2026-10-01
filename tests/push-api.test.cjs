const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function api() {
  const records = new Map();
  const db = {
    ref: (path) => ({
      transaction: async (update) => {
        const value = update(records.get(path) || null);
        if (value !== undefined) records.set(path, value);
        return { committed: value !== undefined };
      },
    }),
  };
  class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  const mocks = {
    'firebase-admin/app': { initializeApp() {} },
    'firebase-admin/database': { getDatabase: () => db },
    'firebase-admin/messaging': { getMessaging() {} },
    'firebase-functions/v2/https': { onCall: (_, handler) => handler, HttpsError },
    'firebase-functions/v2/scheduler': { onSchedule: (_, handler) => handler },
    'firebase-functions/logger': { error() {} },
    './reminders': require('../functions/reminders'),
    './delivery': require('../functions/delivery'),
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync('functions/index.js', 'utf8'), {
    exports,
    URL,
    console,
    require: (id) => mocks[id] || require(id),
  });
  return { register: exports.setPushDevice, records };
}
const request = {
  auth: { uid: 'owner' },
  rawRequest: { headers: { origin: 'https://scheduler.test' } },
  data: {
    token: 'a-valid-token-with-at-least-20-characters',
    enabled: true,
    url: 'https://scheduler.test/',
    timeZone: 'America/New_York',
  },
};

test('registration requires authentication and uses verified UID instead of client UID', async () => {
  const { register, records } = api();
  await assert.rejects(register({ ...request, auth: null }), { code: 'unauthenticated' });
  assert.equal(records.size, 0);
  await register({ ...request, data: { ...request.data, uid: 'someone-else' } });
  assert.equal([...records.values()][0].uid, 'owner');
});
test('registration rejects invalid device, origin and time zone', async () => {
  const { register, records } = api();
  for (const data of [
    { token: '' },
    { url: 'http://scheduler.test/' },
    { url: 'https://other.test/' },
    { timeZone: 'Not/AZone' },
  ]) {
    await assert.rejects(register({ ...request, data: { ...request.data, ...data } }), {
      code: 'invalid-argument',
    });
  }
  assert.equal(records.size, 0);
});
test('one user cannot delete another user device; owner can revoke it', async () => {
  const { register, records } = api();
  await register(request);
  const data = { ...request.data, enabled: false };
  await register({ ...request, auth: { uid: 'other' }, data });
  assert.equal([...records.values()][0].uid, 'owner');
  await register({ ...request, data });
  assert.equal([...records.values()][0], null);
});
