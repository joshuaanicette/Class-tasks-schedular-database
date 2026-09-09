// Sync Manager Class
class SyncManager {
  constructor() {
    this.user = null;
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncQueue = [];
    this.lastSyncTime = null;
    this.listeners = [];

    this.init();
  }

  init() {
    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateSyncStatus();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateSyncStatus();
    });

    // Listen for auth state changes
    if (firebaseAuth) {
      firebaseAuth.onAuthStateChanged((user) => {
        this.user = user;
        this.updateUI();

        if (user) {
          this.setupRealtimeSync();
          // Initial sync from cloud
          this.pullFromCloud();
        } else {
          this.removeRealtimeListeners();
        }
      });
    }

    this.updateSyncStatus();
  }

  updateSyncStatus() {
    const indicator = document.getElementById('syncIndicator');
    const statusText = document.getElementById('syncStatusText');

    if (!indicator || !statusText) return;

    indicator.className = 'sync-indicator';

    if (!isFirebaseConfigured) {
      indicator.classList.add('guest');
      statusText.textContent = 'Local Only';
    } else if (!this.user) {
      indicator.classList.add('guest');
      statusText.textContent = 'Guest Mode';
    } else if (!this.isOnline) {
      indicator.classList.add('offline');
      statusText.textContent = 'Offline';
    } else if (this.isSyncing) {
      indicator.classList.add('syncing');
      statusText.textContent = 'Syncing...';
    } else {
      indicator.classList.add('synced');
      statusText.textContent = 'Synced ✓';
    }
  }

  updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const forceSyncBtn = document.getElementById('forceSyncBtn');
    const userDisplayName = document.getElementById('userDisplayName');
    const userEmail = document.getElementById('userEmail');

    if (this.user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'flex';
      if (forceSyncBtn) forceSyncBtn.style.display = 'flex';
      if (userDisplayName) userDisplayName.textContent = this.user.email.split('@')[0];
      if (userEmail) userEmail.textContent = this.user.email;
    } else {
      if (loginBtn) loginBtn.style.display = 'flex';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (forceSyncBtn) forceSyncBtn.style.display = 'none';
      if (userDisplayName) userDisplayName.textContent = 'Guest';
      if (userEmail) userEmail.textContent = 'Data saved locally only';
    }

    this.updateSyncStatus();
  }

  // Sign up new user
  async signUp(email, password) {
    if (!firebaseAuth) throw new Error('Firebase not configured');

    try {
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      // Push local data to cloud after signup
      await this.pushToCloud();
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  // Sign in existing user
  async signIn(email, password) {
    if (!firebaseAuth) throw new Error('Firebase not configured');

    try {
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  // Sign out
  async signOut() {
    if (!firebaseAuth) return;

    try {
      await firebaseAuth.signOut();
      this.user = null;
      this.updateUI();
      if (typeof taskScheduler !== 'undefined') {
        taskScheduler.showNotification('Signed out. Data will only be saved locally.', 'info');
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  // Setup realtime listeners
  setupRealtimeSync() {
    if (!this.user || !firebaseDb) return;

    const userId = this.user.uid;
    const userRef = firebaseDb.ref(`users/${userId}`);

    // Listen for changes from cloud
    this.listeners.push(
      userRef.child('courses').on('value', (snapshot) => {
        if (snapshot.exists() && typeof taskScheduler !== 'undefined') {
          const cloudCourses = snapshot.val() || [];
          // Only update if different from local
          const localData = JSON.stringify(taskScheduler.courses);
          const cloudData = JSON.stringify(Object.values(cloudCourses));
          if (localData !== cloudData && !this.isSyncing) {
            taskScheduler.courses = Object.values(cloudCourses);
            taskScheduler.renderCourses();
            taskScheduler.updateCourseSelect();
          }
        }
      }),
    );

    this.listeners.push(
      userRef.child('tasks').on('value', (snapshot) => {
        if (snapshot.exists() && typeof taskScheduler !== 'undefined') {
          const cloudTasks = snapshot.val() || [];
          const tasksArray = Object.values(cloudTasks).map((task) => ({
            ...task,
            dueDate: new Date(task.dueDate),
            createdAt: new Date(task.createdAt),
          }));
          const localData = JSON.stringify(
            taskScheduler.tasks.map((t) => ({
              ...t,
              dueDate: t.dueDate.toISOString(),
              createdAt: t.createdAt.toISOString(),
            })),
          );
          const cloudData = JSON.stringify(Object.values(cloudTasks));
          if (localData !== cloudData && !this.isSyncing) {
            taskScheduler.tasks = tasksArray;
            taskScheduler.renderTasks();
            taskScheduler.updateStats();
          }
        }
      }),
    );

    this.listeners.push(
      userRef.child('archives').on('value', (snapshot) => {
        if (snapshot.exists() && typeof taskScheduler !== 'undefined') {
          const cloudArchives = snapshot.val() || [];
          taskScheduler.archives = Object.values(cloudArchives);
          taskScheduler.renderArchive();
        }
      }),
    );
  }

  removeRealtimeListeners() {
    if (!firebaseDb || !this.user) return;

    const userId = this.user.uid;
    const userRef = firebaseDb.ref(`users/${userId}`);

    userRef.child('courses').off();
    userRef.child('tasks').off();
    userRef.child('archives').off();

    this.listeners = [];
  }

  // Push local data to cloud
  async pushToCloud() {
    if (!this.user || !firebaseDb || !this.isOnline) {
      this.queueSync('push');
      return;
    }

    this.isSyncing = true;
    this.updateSyncStatus();

    try {
      const userId = this.user.uid;
      const userRef = firebaseDb.ref(`users/${userId}`);

      if (typeof taskScheduler !== 'undefined') {
        // Convert arrays to objects with IDs as keys for better merging
        const coursesObj = {};
        taskScheduler.courses.forEach((c) => (coursesObj[c.id] = c));

        const tasksObj = {};
        taskScheduler.tasks.forEach((t) => {
          tasksObj[t.id] = {
            ...t,
            dueDate: t.dueDate.toISOString(),
            createdAt: t.createdAt.toISOString(),
          };
        });

        const archivesObj = {};
        taskScheduler.archives.forEach((a, i) => (archivesObj[a.id || i] = a));

        await userRef.update({
          courses: coursesObj,
          tasks: tasksObj,
          archives: archivesObj,
          lastUpdated: firebase.database.ServerValue.TIMESTAMP,
        });

        this.lastSyncTime = new Date();
      }
    } catch (error) {
      console.error('Push to cloud error:', error);
      this.queueSync('push');
    } finally {
      this.isSyncing = false;
      this.updateSyncStatus();
    }
  }

  // Pull data from cloud
  async pullFromCloud() {
    if (!this.user || !firebaseDb || !this.isOnline) return;

    this.isSyncing = true;
    this.updateSyncStatus();

    try {
      const userId = this.user.uid;
      const snapshot = await firebaseDb.ref(`users/${userId}`).once('value');

      if (snapshot.exists() && typeof taskScheduler !== 'undefined') {
        const data = snapshot.val();

        if (data.courses) {
          taskScheduler.courses = Object.values(data.courses);
          localStorage.setItem('taskSchedulerCourses', JSON.stringify(taskScheduler.courses));
        }

        if (data.tasks) {
          taskScheduler.tasks = Object.values(data.tasks).map((task) => ({
            ...task,
            dueDate: new Date(task.dueDate),
            createdAt: new Date(task.createdAt),
          }));
          localStorage.setItem('taskSchedulerTasks', JSON.stringify(taskScheduler.tasks));
        }

        if (data.archives) {
          taskScheduler.archives = Object.values(data.archives);
          localStorage.setItem('taskSchedulerArchives', JSON.stringify(taskScheduler.archives));
        }

        // Refresh UI
        taskScheduler.renderCourses();
        taskScheduler.renderTasks();
        taskScheduler.updateStats();
        taskScheduler.updateCourseSelect();
        taskScheduler.renderArchive();

        taskScheduler.showNotification('✅ Data synced from cloud!', 'success');
      } else {
        // No cloud data, push local data
        await this.pushToCloud();
      }

      this.lastSyncTime = new Date();
    } catch (error) {
      console.error('Pull from cloud error:', error);
    } finally {
      this.isSyncing = false;
      this.updateSyncStatus();
    }
  }

  // Force sync
  async forceSync() {
    if (!this.user) {
      if (typeof taskScheduler !== 'undefined') {
        taskScheduler.showNotification('Please sign in to sync', 'error');
      }
      return;
    }

    await this.pushToCloud();
    if (typeof taskScheduler !== 'undefined') {
      taskScheduler.showNotification('✅ Data synced!', 'success');
    }
  }

  // Queue sync for when online
  queueSync(type) {
    if (!this.syncQueue.includes(type)) {
      this.syncQueue.push(type);
    }
  }

  // Process sync queue when back online
  async processSyncQueue() {
    if (!this.isOnline || !this.user || this.syncQueue.length === 0) return;

    while (this.syncQueue.length > 0) {
      const type = this.syncQueue.shift();
      if (type === 'push') {
        await this.pushToCloud();
      }
    }
  }

  // Save with sync
  async saveAndSync(type) {
    // Always save to localStorage first
    if (typeof taskScheduler !== 'undefined') {
      if (type === 'courses' || type === 'all') {
        localStorage.setItem('taskSchedulerCourses', JSON.stringify(taskScheduler.courses));
      }
      if (type === 'tasks' || type === 'all') {
        localStorage.setItem('taskSchedulerTasks', JSON.stringify(taskScheduler.tasks));
      }
      if (type === 'archives' || type === 'all') {
        localStorage.setItem('taskSchedulerArchives', JSON.stringify(taskScheduler.archives));
      }
    }

    // Then sync to cloud if signed in
    if (this.user && this.isOnline) {
      await this.pushToCloud();
    }
  }
}
