// Auth UI Functions
function showAuthModal(type = 'login') {
  const modal = document.getElementById('authModal');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (!isFirebaseConfigured) {
    alert(
      'Cloud sync is unavailable right now. Your work is saved on this device. Please try again when connected.',
    );
    return;
  }

  modal.classList.add('active');

  if (type === 'login') {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
  }

  // Clear errors
  document.getElementById('authError').classList.remove('show');
  document.getElementById('signupError').classList.remove('show');
}

function hideAuthModal() {
  document.getElementById('authModal').classList.remove('active');
  document.getElementById('userDropdown').classList.remove('show');
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.sync-status') && !e.target.closest('.user-dropdown')) {
    document.getElementById('userDropdown')?.classList.remove('show');
  }
});

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('authError');

  try {
    await syncManager.signIn(email, password);
    hideAuthModal();
    if (typeof taskScheduler !== 'undefined') {
      taskScheduler.showNotification('✅ Signed in! Your data is now syncing.', 'success');
    }
  } catch (error) {
    errorDiv.textContent = getAuthErrorMessage(error.code);
    errorDiv.classList.add('show');
  }
}

async function handleSignup(e) {
  e.preventDefault();

  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const errorDiv = document.getElementById('signupError');

  if (password !== confirm) {
    errorDiv.textContent = 'Passwords do not match';
    errorDiv.classList.add('show');
    return;
  }

  try {
    await syncManager.signUp(email, password);
    hideAuthModal();
    if (typeof taskScheduler !== 'undefined') {
      taskScheduler.showNotification('✅ Account created! Your data is now syncing.', 'success');
    }
  } catch (error) {
    errorDiv.textContent = getAuthErrorMessage(error.code);
    errorDiv.classList.add('show');
  }
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'This email is already registered. Try signing in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'Email/password sign in is not enabled.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return messages[code] || 'An error occurred. Please try again.';
}
