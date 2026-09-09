// Update Sync Tab UI based on auth state
function updateSyncTabUI() {
  const indicator = document.getElementById('syncIndicatorLarge');
  const statusText = document.getElementById('syncStatusLarge');
  const description = document.getElementById('syncDescription');
  const actionsLoggedOut = document.getElementById('syncActions');
  const actionsLoggedIn = document.getElementById('syncActionsLoggedIn');

  if (!indicator) return;

  indicator.className = 'sync-indicator';

  if (!isFirebaseConfigured) {
    indicator.classList.add('guest');
    statusText.textContent = 'Firebase Not Configured';
    description.textContent = 'Follow the setup guide below to enable cloud sync.';
    actionsLoggedOut.style.display = 'none';
    actionsLoggedIn.style.display = 'none';
  } else if (syncManager.user) {
    indicator.classList.add('synced');
    statusText.textContent = 'Connected & Syncing';
    description.textContent = `Signed in as ${syncManager.user.email}. Your data is syncing across all devices.`;
    actionsLoggedOut.style.display = 'none';
    actionsLoggedIn.style.display = 'block';
  } else {
    indicator.classList.add('guest');
    statusText.textContent = 'Not Connected';
    description.textContent = 'Sign in to sync your data across all your devices.';
    actionsLoggedOut.style.display = 'block';
    actionsLoggedIn.style.display = 'none';
  }
}
