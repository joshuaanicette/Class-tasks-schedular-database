// All scripts and feature registrations are loaded before this entry point.
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Bind core state before authentication callbacks or feature initialization can use it.
let syncManager = null;
const taskScheduler = new TaskSchedulerPro();
syncManager = new SyncManager();
const originalUpdateUI = syncManager.updateUI.bind(syncManager);
syncManager.updateUI = function () {
  originalUpdateUI();
  updateSyncTabUI();
};

window.SchedulerFeatures.start();
updateSyncTabUI();
initializeAccessibility();
