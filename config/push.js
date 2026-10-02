// Public Firebase Web Push key. Worker setup: docs/background-reminders.md
window.SchedulerPushConfig = {
  provider: 'cloudflare',
  workerUrl: '', // Paste the deployed https://class-task-reminders.<account>.workers.dev URL.
  vapidKey: 'BG-CWwhBrTfG_gOHvNr-CGoxzABiENPjiuFidoTO3gdkv_fOVnbr-XINCdxYajzDP7uDs71MxDQjqyQ8L04R36w',
  region: 'us-central1', // Used only when provider is explicitly set to 'firebase'.
};
