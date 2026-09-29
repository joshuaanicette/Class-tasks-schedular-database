# Background assignment reminders

The open page cannot keep timers running when a phone suspends it or the browser closes. This implementation uses Firebase Cloud Messaging, a service worker, and a scheduled Firebase Function. The scheduled job reads the existing `users/{uid}/tasks` records every five minutes, so the page does not have to run.

## One-time deployment

1. Use the existing Firebase project `class-tak-scheduler`. Cloud Functions and Cloud Scheduler require billing to be enabled (Blaze). Review the project's billing before deploying; this repository does not enable billing automatically.
2. In Firebase Console → Project settings → Cloud Messaging → Web Push certificates, generate or use the existing key pair. Copy its **public** key to `vapidKey` in `config/push.js`. Do not copy private keys or service-account credentials into the site or repository. Ensure the FCM Registration API and Firebase Cloud Messaging API are enabled.
3. Review the deployed Realtime Database rules. Keep `users/$uid` restricted to `auth != null && auth.uid === $uid`. The new top-level `pushDevices` path must deny all client reads and writes; callable functions access it through the Admin SDK. A broad root-level read/write grant overrides child denials and must not be present. Merge these requirements into the existing rules, preserving other application rules; no rules are deployed by this change.
4. With an authorized Firebase CLI login, install and deploy from the repository root:

   ```sh
   npm ci
   npm ci --prefix functions
   firebase deploy --project class-tak-scheduler --only functions:scheduler-push
   ```

   `firebase.json` adds only the `scheduler-push` functions codebase. The functions use `us-central1`; if changed, change `config/push.js` as well. Scheduled delivery uses the function's managed credentials, not a browser API key. Confirm `setPushDevice` and `sendAssignmentReminders` deploy and the scheduler job is enabled.

5. Build/deploy the website through its existing Vercel pipeline (`npm run build`). The output includes `firebase-messaging-sw.js`, `manifest.webmanifest`, icons, and the public push configuration. Serve the worker as JavaScript at the app root over HTTPS. Do not rewrite the worker URL to `index.html` or cache it indefinitely.
6. Sign in, let assignments sync, open Reminders, and tap **Enable background reminders** on each device. Allow the OS permission prompt. On iPhone/iPad, add the site to the Home Screen and open it from that icon first (iOS/iPadOS 16.4 or later). Guest/local-only assignments have no server copy and cannot trigger background push.
7. Verify on an actual Android phone and installed iPhone/iPad web app: create a near-due unfinished assignment, wait for cloud sync, close the app, and allow at least one five-minute scheduler run. Tap the notification to reopen the app. Check permission denial, completion, snooze, settings changes, sign-out, and **Turn off on this device**. Verify function logs if delivery fails.

## Behavior and boundaries

- Preferences, snoozes, and time zone are saved per device. Changes must reach the server before they affect delivery; reconnect and save again if the UI reports a failure. Synced task completion/deletion and due-date edits are read from the database on subsequent runs.
- The digest excludes completed/submitted tasks and respects the device's reminder categories. Local calendar dates use the device's IANA time zone, including daylight-saving changes.
- A digest is sent when its assignment set/category/deadline changes or on the next local day. A database lease and persisted digest key suppress overlapping runs and ordinary duplicates. An interrupted send after FCM accepts it but before the database records success may retry; FCM does not provide exactly-once delivery.
- Invalid device tokens are removed; temporary send errors retry on later runs. Permission is never requested automatically. Explicit sign-out first unregisters the device; if unregistering fails, sign-out reports an error so the user can reconnect or block notifications in OS settings.
- Background notifications may appear on the lock screen and contain an assignment title. OS notification settings, Focus modes, network connectivity, and push-service policies control actual presentation and timing. Notifications are not exact-time alarms. A queued notification may still arrive after an assignment changes.
- Foreground delivery uses the service worker notification API, which works on mobile browsers that reject the page's `new Notification(...)` constructor. FCM displays background payloads once; the worker does not add a duplicate background handler.
- There is no offline page cache. Installing the web app and receiving a push does not guarantee the planner itself loads without a connection.
- The scheduled worker is designed for this small planner: it scans registered devices and reads tasks once per user per invocation. For a large deployment, add paginated queues and monitor execution time, database reads, and messaging failures.

## Validation

`npm run check`, `npm test`, `npm run format:check`, and `npm run build` cover syntax/assets, existing planner regressions, server digest selection, time zones, retries, duplicate suppression, client permission/registration states, and mobile notification API selection. Tests do not send real push messages or connect to the production database. Live device delivery remains a deployment acceptance check.

References: [Firebase web messaging setup](https://firebase.google.com/docs/cloud-messaging/web/get-started), [message reception](https://firebase.google.com/docs/cloud-messaging/web/receive-messages), [scheduled functions](https://firebase.google.com/docs/functions/schedule-functions), [WebKit iOS/iPadOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
