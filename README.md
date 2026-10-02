# Class Task Scheduler

A student planner for courses, assignments, grades, weekly schedules, study time, and reminders. Built with HTML, CSS, and JavaScript, with optional Firebase Authentication and Realtime Database sync.

## Run locally

Use Node.js 22 or newer for development checks:

```sh
npm ci
npm run check
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. The app has no runtime npm dependencies or framework compilation; the build validates scripts and copies public files into `dist/`.

## Features

- Courses with grade categories, lecture/lab components, meeting times, and academic terms
- Assignment creation, editing, completion, priorities, search, and filtering
- Weighted grades, what-if calculations, progress, and archived terms
- Calendar and weekly assessment views; calendar export for Google, Outlook, and other ICS clients
- PDF syllabus parsing, including keyword-based assessment extraction
- Study-time tracking, reminder settings, snoozing, and browser alerts
- Device-local persistence, JSON backup/import, and optional account-based cloud sync
- Responsive layout, selectable palettes, keyboard tabs, dialog focus handling, and reduced-motion support

The existing 2026–2028 academic calendar data is preserved. Review dates against your course and university calendars when planning a new term. In-app reminders run while the app is open. Optional background push reminders use Firebase Cloud Messaging and a scheduled Cloudflare Worker on the free plan; they require the one-time [background reminder deployment](docs/background-reminders.md) before users can enable them on each device.

## Assignment workspace

The Assignments tab starts with a collapsed editor and a full-width assignment list. Use **Add Assignment** to open the editor; **Cancel** discards the form changes. Editing an existing assignment permits past due dates and keeps its original deadline unless the date field changes.

Class hubs combine with search and status filters. Group the results by date, priority, or assignment type, or return to the original list. **Today & This Week** shows unfinished overdue work, today's remaining deadlines, and upcoming work through Sunday in local time. Selecting Completed, Awaiting grade, or Graded switches back to All dates so finished work remains discoverable.

Each card has a **Quick edit** panel for priority, work status, and grade. Work status and grading are independent: Submitted work is finished for reminders and workload calculations but appears under Awaiting grade until a grade is entered. Zero is a valid grade. Existing completed assignments retain their status. The optional `submitted` and `submittedAt` fields extend existing records; the existing `completed` flag continues to drive legacy views and sync.

Select visible assignments to change their priority, due date, or work status together. Changing the visible results drops hidden selections. **Undo** reverses completion, deletion, quick edits, or bulk changes during the current session (up to ten actions); it preserves unrelated edits and refuses to overwrite newer changes to the same fields. Refreshing the page or dismissing Undo clears this temporary history.

The selected class, grouping, status filter, time range, and whether the Assignments tab was active are remembered in this browser. Preferences are separate from task data and are not synced across devices. Search text and bulk selections are temporary.

## Code layout

| Location                | Responsibility                                                                   |
| ----------------------- | -------------------------------------------------------------------------------- |
| `index.html`            | App markup and explicit stylesheet/script load order                             |
| `assets/css/`           | Base theme, feature styles, and shared interface polish                          |
| `config/firebase.js`    | Existing Firebase web-project configuration                                      |
| `src/app.js`            | Construct the scheduler, connect sync, initialize features                       |
| `src/shared/`           | Shared escaping, date/storage helpers, ordered feature registry                  |
| `src/scheduler/core.js` | Scheduler state, initial rendering, events, and notifications                    |
| `src/scheduler/`        | Course, task, grade, syllabus, calendar, progress, and persistence methods       |
| `src/services/`         | Firebase initialization, sync, and ICS export                                    |
| `src/features/`         | Academic planner, insights, components, assessments, palettes, syllabus keywords |
| `src/ui/`               | Authentication UI, navigation, sync status, and accessibility                    |
| `tests/`                | Regression coverage using Node's test runner and a simulated DOM                 |
| `scripts/`              | Syntax/asset checks and static build                                             |

Scheduler method modules extend `TaskSchedulerPro.prototype` before construction. Feature modules register initializers in the order listed in `index.html`; `src/app.js` starts them after core state exists. There are no arbitrary startup delays or dynamically inserted feature scripts.

The classic-script API (`taskScheduler`, `syncManager`, and existing global UI handlers) is retained for compatibility with the app's markup and feature extensions. Storage keys and record fields are retained, so this refactor does not require a data migration.

## Firebase and external services

`config/firebase.js` retains the existing Firebase project, so this branch connects to the same backend when users sign in. Firebase web configuration is public client metadata, not an authorization boundary. Keep database access restricted to the authenticated user's records through your project's Firebase rules. Do not add service-account credentials to this repository.

Firebase and PDF.js are loaded from their existing CDNs. Local planning remains available if those SDKs cannot load; PDF import and cloud sync require their respective services. A new deployment origin needs to be authorized in your Firebase Authentication settings.

Local browser storage belongs to its origin. A preview URL will not automatically receive local-only records from your production URL; use an exported backup or sign in to the existing sync account.

## Quality checks

```sh
npm run check        # JavaScript syntax and referenced local assets
npm test             # Startup, forms, persistence, imports, navigation, date boundaries
npm run format:check # Consistent formatting
npm run format       # Apply formatting
npm run build        # Produce deployable static files
```

Tests use a simulated DOM and do not connect to Firebase or request notification permission. They are not browser visual tests or live cloud-integration tests. Before merging, review the layout on desktop/mobile and verify sign-in/sync and PDF imports in your normal environment.

## Deployment

The existing Vercel configuration now runs `npm run build` and publishes `dist/`. For another static host, use the same output directory. Keep the original repository's MIT license.
