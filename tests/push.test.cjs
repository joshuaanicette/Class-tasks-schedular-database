const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildDigest, localDay, normalizePreferences } = require('../functions/reminders');
const { deliverDevice } = require('../functions/delivery');

const now = Date.parse('2026-09-29T15:00:00Z');
const task = { id: 1, title: 'Worksheet', dueDate: '2026-09-29T23:00:00Z', completed: false };
const device = {
  uid: 'user-1',
  token: 'device-token',
  timeZone: 'America/New_York',
  url: 'https://scheduler.test/',
};

test('server builds reminders without a browser session', () => {
  assert.match(buildDigest({ 1: task }, device, now).body, /Worksheet — Due today/);
});
test('completed, submitted, invalid and snoozed assignments are silent', () => {
  for (const change of [{ completed: true }, { submitted: true }, { dueDate: 'invalid' }]) {
    assert.equal(buildDigest({ 1: { ...task, ...change } }, device, now), null);
  }
  assert.equal(buildDigest({ 1: task }, { ...device, snoozes: { 1: now + 1000 } }, now), null);
  assert.ok(buildDigest({ 1: task }, { ...device, snoozes: { 1: now - 1000 } }, now));
});
test('device time zone determines the calendar day across DST', () => {
  assert.equal(localDay('2026-09-30T01:00:00Z', device.timeZone), Date.UTC(2026, 8, 29));
  assert.equal(localDay('2026-11-02T04:30:00Z', device.timeZone), Date.UTC(2026, 10, 1));
  assert.equal(localDay('2026-03-09T03:30:00Z', device.timeZone), Date.UTC(2026, 2, 8));
});
test('disabled categories do not produce alerts, including overdue on the same day', () => {
  const preferences = Object.fromEntries(
    Object.keys(normalizePreferences()).map((key) => [key, false]),
  );
  for (const date of [
    '2026-09-28T10:00:00Z',
    '2026-09-29T10:00:00Z',
    task.dueDate,
    '2026-09-30T23:00:00Z',
    '2026-10-01T23:00:00Z',
    '2026-10-05T23:00:00Z',
  ]) {
    assert.equal(
      buildDigest([{ ...task, dueDate: date, priority: 'high' }], { ...device, preferences }, now),
      null,
    );
  }
});
test('digest identity is stable for repeated jobs, changes after a deadline edit or next local day', () => {
  const a = buildDigest([task], device, now);
  assert.equal(a.key, buildDigest([task], device, now + 300000).key);
  assert.notEqual(
    a.key,
    buildDigest([{ ...task, dueDate: '2026-09-30T23:00:00Z' }], device, now).key,
  );
  assert.notEqual(a.key, buildDigest([task], device, now + 86400000).key);
});

function memoryRef(initial = device) {
  let value = structuredClone(initial);
  return {
    get value() {
      return value;
    },
    async transaction(update) {
      const next = update(value && structuredClone(value));
      if (next === undefined) return { committed: false };
      value = next;
      return { committed: true };
    },
  };
}

test('overlapping scheduled jobs and repeated runs send once', async () => {
  const ref = memoryRef();
  const digest = buildDigest([task], device, now);
  let sends = 0;
  const send = async (message) => {
    sends++;
    assert.equal(message.webpush.fcmOptions.link, device.url);
  };
  const args = { ref, device, digest, send, now };
  await Promise.all([deliverDevice(args), deliverDevice(args)]);
  await deliverDevice({ ...args, now: now + 300000 });
  assert.equal(sends, 1);
  assert.equal(ref.value.lastKey, digest.key);
});
test('temporary send failures retry; expired registrations are removed', async () => {
  const ref = memoryRef();
  const args = { ref, device, digest: buildDigest([task], device, now), now };
  await assert.rejects(
    deliverDevice({
      ...args,
      send: async () => {
        throw new Error('network');
      },
    }),
  );
  assert.equal(ref.value.lastKey, undefined);
  assert.equal(ref.value.leaseUntil, null);
  assert.equal(await deliverDevice({ ...args, send: async () => {} }), 'sent');
  const expiredRef = memoryRef();
  assert.equal(
    await deliverDevice({
      ...args,
      ref: expiredRef,
      send: async () => {
        throw Object.assign(new Error('expired'), {
          code: 'messaging/registration-token-not-registered',
        });
      },
    }),
    'expired',
  );
  assert.equal(expiredRef.value, null);
});
test('deleted devices, account changes and leased deliveries are skipped', async () => {
  for (const initial of [
    null,
    { ...device, uid: 'other' },
    { ...device, leaseUntil: now + 10000 },
  ]) {
    const result = await deliverDevice({
      ref: memoryRef(initial),
      device,
      digest: buildDigest([task], device, now),
      now,
      send: async () => assert.fail('must not send'),
    });
    assert.equal(result, 'skipped');
  }
});
