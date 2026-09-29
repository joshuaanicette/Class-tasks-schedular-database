'use strict';

// A database lease prevents overlapping scheduled invocations from sending the same digest.
// Successful sends retain their key; temporary failures release the lease for retry.
async function deliverDevice({ ref, device, digest, send, now = Date.now() }) {
  const lease = `${now}:${digest.key}`;
  const claim = await ref.transaction((current) => {
    if (
      !current ||
      current.uid !== device.uid ||
      current.token !== device.token ||
      current.lastKey === digest.key ||
      Number(current.leaseUntil) > now
    )
      return;
    return { ...current, lease, leaseUntil: now + 120000 };
  });
  if (!claim.committed) return 'skipped';
  try {
    await send({
      token: device.token,
      notification: { title: 'Class Task Scheduler', body: digest.body },
      webpush: {
        headers: { TTL: '3600', Urgency: 'normal' },
        notification: { tag: 'class-task-reminder-digest' },
        fcmOptions: { link: device.url },
      },
    });
    await ref.transaction((current) => {
      if (!current || current.lease !== lease) return;
      return { ...current, lastKey: digest.key, lastSentAt: now, lease: null, leaseUntil: null };
    });
    return 'sent';
  } catch (error) {
    const expired = [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
    ].includes(error.code);
    await ref.transaction((current) => {
      if (!current || current.lease !== lease) return;
      return expired ? null : { ...current, lease: null, leaseUntil: null };
    });
    if (!expired) throw error;
    return 'expired';
  }
}

module.exports = { deliverDevice };
