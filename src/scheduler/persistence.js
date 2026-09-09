// Persistence behavior, installed before the scheduler is constructed.
Object.assign(TaskSchedulerPro.prototype, {
  exportData() {
    const data = {
      version: '3.0',
      exportDate: new Date().toISOString(),
      courses: this.courses,
      tasks: this.tasks,
      archives: this.archives,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `task_scheduler_backup_${Date.now()}.json`;
    link.click();

    this.showNotification('Data exported!', 'success');
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (!data || !['courses', 'tasks', 'archives'].every((key) => Array.isArray(data[key]))) {
            throw new Error('Choose a scheduler backup containing courses, tasks, and archives.');
          }
          if (
            data.tasks.some(
              (task) =>
                !task ||
                Number.isNaN(new Date(task.dueDate).getTime()) ||
                Number.isNaN(new Date(task.createdAt).getTime()),
            )
          ) {
            throw new Error('The backup contains invalid assignment dates.');
          }

          if (!confirm('Import will replace all data. Continue?')) return;

          this.courses = data.courses || [];
          this.tasks = window.SchedulerUtils.restoreTasks(data.tasks);
          this.archives = data.archives || [];

          this.saveCourses();
          this.saveTasks();
          this.saveArchives();

          this.renderCourses();
          this.renderTasks();
          this.renderCalendar();
          this.updateStats();
          this.renderProgress();
          this.renderArchive();
          this.updateCourseSelect();
          this.updateGradeCalcCourseSelect();
          this.updateWhatIfCourseSelect();
          this.renderWeeklySchedule();
          this.renderTimeStatistics();
          this.renderUpcomingReminders();

          this.showNotification('Data imported!', 'success');
        } catch (error) {
          this.showNotification(error.message || 'Import failed', 'error');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  },

  loadCourses() {
    return window.SchedulerUtils.readArray('taskSchedulerCourses');
  },

  saveCourses() {
    localStorage.setItem('taskSchedulerCourses', JSON.stringify(this.courses));
    // Sync to cloud
    if (typeof syncManager !== 'undefined' && syncManager) {
      syncManager.saveAndSync('courses');
    }
  },

  loadTasks() {
    return window.SchedulerUtils.restoreTasks(
      window.SchedulerUtils.readArray('taskSchedulerTasks'),
    );
  },

  saveTasks() {
    localStorage.setItem('taskSchedulerTasks', JSON.stringify(this.tasks));
    // Sync to cloud
    if (typeof syncManager !== 'undefined' && syncManager) {
      syncManager.saveAndSync('tasks');
    }
  },

  loadArchives() {
    return window.SchedulerUtils.readArray('taskSchedulerArchives');
  },

  saveArchives() {
    localStorage.setItem('taskSchedulerArchives', JSON.stringify(this.archives));
    // Sync to cloud
    if (typeof syncManager !== 'undefined' && syncManager) {
      syncManager.saveAndSync('archives');
    }
  },
});
