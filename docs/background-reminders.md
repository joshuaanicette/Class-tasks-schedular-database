# Background assignment reminders (Cloudflare Free + Firebase Spark)

The website stays on Vercel. Firebase Authentication and Realtime Database keep accounts and assignments; Firebase Cloud Messaging (FCM) delivers notifications. A Cloudflare Worker registers devices and checks synced assignments while the page is closed. This path does **not** require Firebase Cloud Functions, Cloud Scheduler, or upgrading Firebase to Blaze.

FCM is a no-cost Firebase product. Workers Free and Firebase Spark still have usage limits. This implementation targets a personal/small planner, not unlimited free hosting. Keep the Cloudflare account on Workers Free if you do not want usage-based Worker charges. Do not deploy `functions/` for this setup.

## 1. Prepare Firebase

Use the existing project `class-tak-scheduler`.

- The public Web Push certificate is already in `config/push.js`. Keep it; ensure the FCM Registration API and Firebase Cloud Messaging API (HTTP v1) are enabled in this project.
- Create a **dedicated service account** in Google Cloud IAM for this Worker, with **Firebase Realtime Database Admin** (`roles/firebasedatabase.admin`) and **Firebase Cloud Messaging API Admin** (`roles/firebasecloudmessaging.admin`). Create/download its JSON key to a private location **outside this repository**. These roles let the server read assignments, manage device registrations, and send push. Never paste this JSON into chat, source code, a Vercel public variable, or browser config.
- The Worker verifies signed-in users via Firebase Auth's `accounts:lookup` endpoint. `FIREBASE_WEB_API_KEY` must belong to this same project and allow the Identity Toolkit API. If your browser key has HTTP-referrer restrictions, use a separate server API key restricted to Identity Toolkit for the Worker; do not weaken restrictions on the browser key.

## 2. Merge the database rules

In Firebase Console → Realtime Database → Rules, preserve existing application rules and add this top-level entry inside `rules`:

```json
"cloudflarePushDevices": {
  ".read": false,
  ".write": false,
  ".indexOn": ["nextCheckAt"]
}
```

The index is required for the bounded queue query. Clients must not read/write device tokens. Keep `users/$uid` restricted to `auth != null && auth.uid === $uid`, and deny root reads/writes. A permissive ancestor rule overrides child denials. The Worker uses privileged service-account access; this change does not deploy or overwrite any rules automatically.

## 3. Deploy the Worker

Use Node.js 22+ and a Cloudflare account on the **Workers Free** plan. From the repository root:

```sh
cd worker
npm install
npx wrangler login
npm run check
npm run deploy
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
```

At the secret prompt, paste the **entire JSON service-account file** into your local terminal. Wrangler stores it as an encrypted Worker secret. Do not put credentials in `wrangler.jsonc` or commit them. The initial deployment is intentionally unavailable until this secret exists.

`worker/wrangler.jsonc` already contains this project's public Firebase settings and production Vercel origin. Update `ALLOWED_ORIGINS` with a comma-separated list of exact HTTPS origins you own if testing a branch preview. Do not allow all `*.vercel.app` origins. A new preview URL needs its own allowlist entry and a Worker redeploy.

Copy the deployed URL (for example, `https://class-task-reminders.YOUR-SUBDOMAIN.workers.dev`) into `workerUrl` in `config/push.js`. Keep `provider: 'cloudflare'`. Build/redeploy the Vercel site through its normal pipeline.

The Worker runs a cron trigger every minute and checks at most **two devices per run**, revisiting each device after five minutes. Confirm the cron in Cloudflare → Workers & Pages → class-task-reminders → Settings → Trigger Events. Trigger changes can take time to propagate.

## 4. Verify before relying on reminders

1. Open `https://YOUR-WORKER.workers.dev/health`. It should return `{ "configured": true }`. This only checks required settings, not credential permissions or delivery.
2. Sign in to the website, allow cloud sync to finish, and tap **Enable background reminders**. On iPhone/iPad, first add the website to the Home Screen and open that installed app (iOS/iPadOS 16.4+).
3. Create an unfinished assignment due later today, let it sync, close the app, and allow at least five minutes. Check that tapping the notification opens your planner. FCM and the OS may delay delivery; these are not exact-time alarms.
4. Test completion, snooze, preference changes, sign-out, and **Turn off on this device**. Confirm no new reminders after disabling; already queued notifications may still arrive.
5. Use `npx wrangler tail` in `worker/` and the Cloudflare Metrics dashboard to inspect errors, CPU time, and invocation failures. Logs deliberately omit tokens, assignment titles, and user IDs.

## Free-plan limits and behavior

- Each scheduled invocation performs one indexed queue query, processes at most two devices, and bounds transaction retries. Even the send/finalization/release failure path stays below the Free plan's 50 external subrequests per invocation.
- With two devices each minute and a five-minute revisit, approximately ten active devices fit the nominal cadence. More devices are processed fairly by oldest `nextCheckAt`, but delivery takes longer. Do not increase the batch size without rechecking CPU and subrequest limits.
- Workers Free also has a 10 ms CPU budget per invocation. Time-zone formatters are reused to reduce work, but cold starts and large assignment lists still need **real Worker profiling**. No production CPU/free-quota guarantee is implied by local Node tests. Reduce workload if quota errors occur; do not silently upgrade to a paid plan.
- Firebase Spark database storage/download quotas still apply. The Worker reads synced tasks for the due devices, not the whole users database. There is no new KV, D1, Durable Object, or paid scheduler dependency.
- Registrations expire after 30 days without an app visit or preference update, to avoid endlessly polling abandoned devices. Opening the app renews registration. Re-enable if necessary.
- The Worker reads and writes only its `cloudflarePushDevices` registry and reads existing tasks. It never changes assignment deadlines, completion, classes, or grades.

## Migrating from the old Firebase Functions backend

The legacy `functions/` implementation remains available for existing deployments, but the new client config selects Cloudflare. If you actually deployed the old scheduler, turn off reminders in the old site first, stop/delete its `sendAssignmentReminders` scheduled job, then switch the client and re-enable each device. Do not leave both schedulers delivering for the same devices. If the old endpoint was never deployed, simply follow the setup above. The Cloudflare registry is separate from legacy `pushDevices`.

## Behavior and boundaries

- Preferences, snoozes, and time zone are saved per device. Changes must reach the server before they affect delivery; reconnect and save again if the UI reports a failure. Synced task completion/deletion and due-date edits are read from the database on subsequent runs.
- The digest excludes completed/submitted tasks and respects the device's reminder categories. Local calendar dates use the device's IANA time zone, including daylight-saving changes.
- A digest is sent when its assignment set/category/deadline changes or on the next local day. A database lease and persisted digest key suppress overlapping runs and ordinary duplicates. An interrupted send after FCM accepts it but before the database records success may retry; FCM does not provide exactly-once delivery.
- Invalid device tokens are removed; temporary send errors retry on later runs. Permission is never requested automatically. Explicit sign-out first unregisters the device; if unregistering fails, sign-out reports an error so the user can reconnect or block notifications in OS settings.
- Background notifications may appear on the lock screen and contain an assignment title. OS notification settings, Focus modes, network connectivity, and push-service policies control actual presentation and timing. Notifications are not exact-time alarms. A queued notification may still arrive after an assignment changes.
- Foreground delivery uses the service worker notification API, which works on mobile browsers that reject the page's `new Notification(...)` constructor. FCM displays background payloads once; the worker does not add a duplicate background handler.
- There is no offline page cache. Installing the web app and receiving a push does not guarantee the planner itself loads without a connection.

## Validation

Run `npm test`, `npm run check`, and `npm run build` from the repository root. Run `npm run check --prefix worker` for a Wrangler bundle dry run after installing Worker dependencies. Tests use mocked Firebase/FCM endpoints and never read production data or send notifications. They cover authentication, ownership, input bounds, CORS, bounded scheduling, concurrent preference edits, ETag conflicts, OAuth signing, retries, invalid tokens, client registration states, and existing planner behavior.

A real deployment and Android/iPhone delivery check are still required. Merging this branch alone does not configure Cloudflare or enable background reminders.

References: [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth), [RTDB REST authentication](https://firebase.google.com/docs/database/rest/auth), [RTDB conditional writes](https://firebase.google.com/docs/database/rest/save-data), [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [Cloudflare Free limits](https://developers.cloudflare.com/workers/platform/limits/), [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
