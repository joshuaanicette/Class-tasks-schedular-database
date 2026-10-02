(function () {
  'use strict';

  const storageKey = 'schedulerPushDevice';
  let active = false;
  let busy = false;
  let registration;
  let foregroundListener;
  let authGeneration = 0;
  let operations = Promise.resolve();

  function enqueue(operation) {
    const next = operations.catch(() => {}).then(operation);
    operations = next;
    return next;
  }

  function stored() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch (_) {
      return null;
    }
  }

  function status(message) {
    const el = document.getElementById('backgroundReminderStatus');
    if (el) el.textContent = message;
    const off = document.getElementById('disableBackgroundReminders');
    if (off) off.disabled = busy || !stored();
    const on = document.getElementById('enableBackgroundReminders');
    if (on) on.disabled = busy || active;
  }

  function availability() {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const installed =
      window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
    if (ios && !installed)
      return 'On iPhone or iPad, use Share → Add to Home Screen, then open the app from that icon to enable notifications.';
    if (
      !window.isSecureContext ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return 'Background notifications need HTTPS and a browser that supports Web Push. In-app reminders still work.';
    }
    if (!firebaseAuth?.currentUser)
      return 'Sign in to receive reminders for your synced assignments while the app is closed.';
    if (
      !window.SchedulerPushConfig?.vapidKey ||
      typeof firebase?.messaging !== 'function'
    ) {
      return 'Background reminders are not configured yet. The site owner must finish the Firebase push setup.';
    }
    if (window.SchedulerPushConfig.provider === 'cloudflare') {
      try {
        const url = new URL(window.SchedulerPushConfig.workerUrl);
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
          throw new Error();
      } catch (_) {
        return 'Background reminders are not configured yet. The site owner must connect the reminder service.';
      }
    } else if (typeof firebase?.functions !== 'function') {
      return 'Background reminders are not configured yet. The site owner must finish the reminder setup.';
    }
    return '';
  }

  async function worker() {
    if (registration?.active) return registration;
    const reg = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
    if (!reg.active) {
      await new Promise((resolve, reject) => {
        const sw = reg.installing || reg.waiting;
        if (!sw) return reject(new Error('Notification service could not start. Try again.'));
        const timer = setTimeout(() => {
          sw.removeEventListener('statechange', changed);
          reject(new Error('Notification service timed out. Try again.'));
        }, 15000);
        function changed() {
          if (sw.state === 'activated' || sw.state === 'redundant') {
            clearTimeout(timer);
            sw.removeEventListener('statechange', changed);
            if (sw.state === 'activated') resolve();
            else reject(new Error('Notification service could not start. Try again.'));
          }
        }
        sw.addEventListener('statechange', changed);
        changed();
      });
    }
    registration = reg;
    return reg;
  }

  async function call(data) {
    if (window.SchedulerPushConfig.provider !== 'cloudflare') {
      return firebase.app().functions(window.SchedulerPushConfig.region || 'us-central1')
        .httpsCallable('setPushDevice')(data);
    }
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Sign in again to manage background reminders.');
    const idToken = await user.getIdToken();
    if (firebaseAuth.currentUser?.uid !== user.uid)
      throw new Error('Your account changed. Please try again.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(new URL('/devices', window.SchedulerPushConfig.workerUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(data), signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = {
          unauthenticated: 'Your sign-in expired. Sign in again and retry background reminders.',
          'backend-not-configured': 'The reminder service needs its server configuration completed.',
          'backend-credentials': 'The reminder service could not authenticate with Firebase. The site owner must check its server credentials.',
          'origin-not-allowed': 'This website address is not enabled for background reminders yet.',
          'device-conflict': 'This device is linked to another account. Turn off its reminders there first.',
          'registration-busy': 'Reminder settings changed at the same time. Please try again.',
        };
        throw new Error(messages[result.error] || 'Could not connect to background reminders. The reminder service may be unavailable; try again.');
      }
      if (result.enabled !== data.enabled)
        throw new Error('The reminder service returned an unexpected response. Check its configured address.');
      return { data: result };
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TypeError')
        throw new Error('Could not connect to background reminders. Check your connection and the reminder service address, then try again.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  function payload(token) {
    let snoozes = {};
    try {
      snoozes = JSON.parse(localStorage.getItem('schedulerReminderSnoozes') || '{}');
    } catch (_) {}
    return {
      token,
      enabled: true,
      url: new URL('./', window.location.href).href,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences: taskScheduler.loadReminderSettings?.() || {},
      snoozes,
    };
  }

  async function registerDevice(uid, generation) {
    const reg = await worker();
    if (!(await firebase.messaging.isSupported()))
      throw new Error('This browser does not support background notifications.');
    const messaging = firebase.messaging();
    const token = await messaging.getToken({
      vapidKey: window.SchedulerPushConfig.vapidKey,
      serviceWorkerRegistration: reg,
    });
    if (!token) throw new Error('Could not register this device. Try again.');
    if (firebaseAuth.currentUser?.uid !== uid || generation !== authGeneration) {
      await messaging.deleteToken();
      return;
    }
    await call(payload(token));
    if (firebaseAuth.currentUser?.uid !== uid || generation !== authGeneration) {
      await messaging.deleteToken();
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify({ uid, token }));
    active = true;
    if (!foregroundListener) {
      foregroundListener = messaging.onMessage((message) => {
        if (!active || stored()?.uid !== firebaseAuth.currentUser?.uid) return;
        const notification = message.notification;
        if (notification)
          reg
            .showNotification(notification.title || 'Class Task Scheduler', {
              body: notification.body,
              tag: 'class-task-reminder-digest',
              data: { url: new URL('./', window.location.href).href },
            })
            .catch(() => {});
      });
    }
    status(
      'Background reminders are enabled on this device, including when the app is closed. Assignments must finish syncing first.',
    );
  }

  async function enable() {
    if (busy) return;
    const reason = availability();
    if (reason) return status(reason);
    busy = true;
    status('Enabling background reminders…');
    try {
      // Keep the permission request directly in the user's tap for iOS/iPadOS.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted')
        throw new Error(
          'Notifications are blocked or were not allowed. Enable them in your device or browser settings, then try again.',
        );
      const uid = firebaseAuth.currentUser.uid;
      const generation = authGeneration;
      await enqueue(() => registerDevice(uid, generation));
    } catch (error) {
      active = false;
      status(
        error.code
          ? 'Could not connect to background reminders. Check your connection and notification setup, then try again.'
          : error.message,
      );
    } finally {
      busy = false;
      const el = document.getElementById('backgroundReminderStatus');
      status(el?.textContent || '');
    }
  }

  function disable() {
    active = false;
    ++authGeneration;
    return enqueue(disableDevice);
  }

  async function disableDevice() {
    const device = stored();
    active = false;
    if (!device) return;
    // Remove the server registration before signing out. If offline, retain it for retry.
    if (device.uid === firebaseAuth?.currentUser?.uid)
      await call({ token: device.token, enabled: false });
    try {
      await firebase.messaging().deleteToken();
    } catch (error) {
      if (device.uid !== firebaseAuth?.currentUser?.uid) throw error;
    }
    localStorage.removeItem(storageKey);
    status('Background reminders are off on this device.');
  }

  function syncPreferences() {
    return enqueue(savePreferences);
  }

  async function savePreferences() {
    const device = stored();
    if (!device || device.uid !== firebaseAuth?.currentUser?.uid) return;
    try {
      await call(payload(device.token));
    } catch (_) {
      status(
        'Reminder changes are saved on this device but have not reached background delivery. Reconnect and save the settings again.',
      );
    }
  }

  function restore(user) {
    return enqueue(() => restoreDevice(user));
  }

  async function restoreDevice(user) {
    if (user?.uid !== firebaseAuth?.currentUser?.uid) return;
    const generation = ++authGeneration;
    active = false;
    const device = stored();
    if (!device)
      return status(
        availability() || 'Enable background reminders on each phone, tablet, or computer you use.',
      );
    if (device.uid !== user?.uid) {
      try {
        await firebase.messaging().deleteToken();
        localStorage.removeItem(storageKey);
      } catch (_) {}
      return status(availability() || 'Enable background reminders for this account.');
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      try {
        await disableDevice();
      } catch (_) {}
      return status(
        'Notifications are not allowed. Check your device settings and enable them again.',
      );
    }
    const reason = availability();
    if (reason) return status(reason);
    try {
      await registerDevice(user.uid, generation);
    } catch (_) {
      status(
        'Could not verify background reminders. Reconnect and tap Enable background reminders to retry.',
      );
    }
  }

  window.SchedulerPush = {
    get active() {
      return active;
    },
    disable,
    syncPreferences,
    async showLocal(title, options) {
      if ('serviceWorker' in navigator && window.isSecureContext) {
        const reg = await worker();
        return reg.showNotification(title, options);
      }
      return new Notification(title, options);
    },
  };

  window.SchedulerFeatures.register('background-push', () => {
    const panel = document.querySelector('.reminder-settings');
    if (!panel) return;
    const section = document.createElement('div');
    section.innerHTML =
      '<h4>Reminders when the app is closed</h4><p id="backgroundReminderStatus" role="status" aria-live="polite"></p><div class="reminder-controls-row"><button type="button" class="reminder-action-btn primary" id="enableBackgroundReminders">Enable background reminders</button><button type="button" class="reminder-action-btn" id="disableBackgroundReminders">Turn off on this device</button></div>';
    panel.appendChild(section);
    document.getElementById('enableBackgroundReminders').addEventListener('click', enable);
    document.getElementById('disableBackgroundReminders').addEventListener('click', () => {
      disable().catch(() =>
        status(
          'Could not turn off background reminders. Reconnect and try again, or block notifications in your device settings.',
        ),
      );
    });
    status(
      availability() || 'Enable background reminders on each phone, tablet, or computer you use.',
    );
    firebaseAuth?.onAuthStateChanged(restore);
    window.addEventListener('online', () => restore(firebaseAuth?.currentUser));
    window.addEventListener('storage', (event) => {
      if (event.key === storageKey) restore(firebaseAuth?.currentUser);
    });
  });
})();
