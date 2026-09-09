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

The existing 2026–2028 academic calendar data is preserved. Review dates against your course and university calendars when planning a new term. Browser reminders run while the app is open; this is not a background push-notification service.

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
