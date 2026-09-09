// Check if Firebase config is set up
let isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_'),
);

// Initialize Firebase only if configured
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.database();
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    isFirebaseConfigured = false;
    console.error('Firebase initialization error:', error);
  }
} else {
  console.log('⚠️ Firebase not configured - running in local-only mode');
}
