'use strict';

const { createHash } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const { normalizePreferences, localDay, buildDigest } = require('./reminders');
const { deliverDevice } = require('./delivery');

initializeApp();
const options = { region: 'us-central1', maxInstances: 3 };

// Clients never read or write pushDevices directly. UID always comes from verified Firebase Auth.
exports.setPushDevice = onCall(options, async (request) => {
  if (!request.auth)
    throw new HttpsError('unauthenticated', 'Sign in to enable background reminders.');
  const data = request.data || {};
  if (typeof data.token !== 'string' || data.token.length < 20 || data.token.length > 4096) {
    throw new HttpsError('invalid-argument', 'Invalid device token.');
  }
  const key = createHash('sha256').update(data.token).digest('hex');
  const ref = getDatabase().ref(`pushDevices/${key}`);
  if (data.enabled === false) {
    await ref.transaction((current) => (current?.uid === request.auth.uid ? null : undefined));
    return { enabled: false };
  }
  let url;
  try {
    url = new URL(data.url);
    if (
      url.protocol !== 'https:' ||
      url.origin !== request.rawRequest.headers.origin ||
      url.username ||
      url.password
    )
      throw new Error();
    localDay(Date.now(), data.timeZone);
    if (typeof data.timeZone !== 'string' || data.timeZone.length > 100) throw new Error();
  } catch (_) {
    throw new HttpsError('invalid-argument', 'A secure app URL and valid time zone are required.');
  }
  const snoozes = {};
  for (const [id, until] of Object.entries(data.snoozes || {}).slice(0, 1000)) {
    if (/^[a-zA-Z0-9_-]{1,100}$/.test(id) && Number.isFinite(until) && until > Date.now()) {
      snoozes[id] = Math.min(until, Date.now() + 30 * 86400000);
    }
  }
  await ref.transaction((current) => ({
    ...(current?.uid === request.auth.uid ? current : {}),
    uid: request.auth.uid,
    token: data.token,
    url: url.href,
    timeZone: data.timeZone,
    preferences: normalizePreferences(data.preferences),
    snoozes,
    updatedAt: Date.now(),
  }));
  return { enabled: true };
});

exports.sendAssignmentReminders = onSchedule(
  {
    ...options,
    schedule: 'every 5 minutes',
    timeZone: 'UTC',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getDatabase();
    const devices = (await db.ref('pushDevices').once('value')).val() || {};
    const tasksByUser = new Map();
    for (const [key, device] of Object.entries(devices)) {
      try {
        if (!device.uid || !device.token) continue;
        if (!tasksByUser.has(device.uid)) {
          tasksByUser.set(
            device.uid,
            (await db.ref(`users/${device.uid}/tasks`).once('value')).val() || {},
          );
        }
        const digest = buildDigest(tasksByUser.get(device.uid), device);
        if (!digest) continue;
        await deliverDevice({
          ref: db.ref(`pushDevices/${key}`),
          device,
          digest,
          send: (message) => getMessaging().send(message),
        });
      } catch (error) {
        // Do not log tokens, assignment titles, or device payloads.
        logger.error('Background reminder delivery failed', {
          deviceId: key,
          code: error.code || 'unknown',
        });
      }
    }
  },
);
