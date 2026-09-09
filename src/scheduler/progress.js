// Progress behavior, installed before the scheduler is constructed.
Object.assign(TaskSchedulerPro.prototype, {
  renderProgress() {
    const gpa = this.calculateOverallGPA();
    document.getElementById('overallGPA').textContent = gpa || '-';

    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('completionRate').textContent = `${completionRate}%`;

    const totalCredits = this.courses.reduce((sum, c) => sum + (c.credits || 0), 0);
    document.getElementById('totalCredits').textContent = totalCredits.toFixed(1);

    document.getElementById('activeCourses').textContent = this.courses.length;

    const courseProgressBars = document.getElementById('courseProgressBars');
    if (this.courses.length === 0) {
      courseProgressBars.innerHTML = '<p style="color: var(--text-secondary);">No courses yet</p>';
    } else {
      courseProgressBars.innerHTML = this.courses
        .map((course) => {
          const courseTasks = this.tasks.filter((t) => t.courseId === course.id);
          const completedTasks = courseTasks.filter((t) => t.completed).length;
          const progress =
            courseTasks.length > 0 ? Math.round((completedTasks / courseTasks.length) * 100) : 0;

          return `
                    <div class="progress-bar-container">
                        <div class="progress-bar-label">
                            <span>${course.name}</span>
                            <span>${completedTasks}/${courseTasks.length}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar-fill" style="width: ${progress}%">${progress}%</div>
                        </div>
                    </div>
                `;
        })
        .join('');
    }
  },

  archiveCurrentSemester() {
    if (this.courses.length === 0) {
      this.showNotification('No courses to archive', 'info');
      return;
    }

    const semesterName = prompt('Semester name:', 'Winter 2025');
    if (!semesterName) return;

    const archive = {
      id: Date.now(),
      name: sanitizeInput(semesterName),
      courses: [...this.courses],
      tasks: [...this.tasks],
      archivedAt: new Date(),
      gpa: this.calculateOverallGPA(),
    };

    this.archives.push(archive);
    this.courses = [];
    this.tasks = [];

    this.saveArchives();
    this.saveCourses();
    this.saveTasks();

    this.renderArchive();
    this.renderCourses();
    this.renderTasks();
    this.showNotification('Semester archived!', 'success');
  },

  renderArchive() {
    const archiveList = document.getElementById('archiveList');

    if (this.archives.length === 0) {
      archiveList.innerHTML = '<div class="empty-state"><h3>No archives</h3></div>';
      return;
    }

    archiveList.innerHTML = this.archives
      .sort((a, b) => b.archivedAt - a.archivedAt)
      .map(
        (archive) => `
            <div class="archive-item">
                <h3>${archive.name}</h3>
                <p>${archive.courses.length} courses • ${archive.tasks.length} assignments
                   ${archive.gpa ? ` • GPA: ${archive.gpa}` : ''}</p>
                <p style="color: var(--text-secondary); font-size: 0.9em;">
                    ${new Date(archive.archivedAt).toLocaleDateString()}
                </p>
            </div>
        `,
      )
      .join('');
  },

  renderTimeStatistics() {
    // Calculate time spent this week, month, semester
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const completedTasks = this.tasks.filter((t) => t.completed);

    const weekTasks = completedTasks.filter((t) => new Date(t.completedAt || t.dueDate) >= weekAgo);
    const monthTasks = completedTasks.filter(
      (t) => new Date(t.completedAt || t.dueDate) >= monthAgo,
    );

    const weekTime = weekTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
    const monthTime = monthTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
    const semesterTime = completedTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);

    // Only update if elements exist
    const weekEl = document.getElementById('totalTimeWeek');
    const monthEl = document.getElementById('totalTimeMonth');
    const semesterEl = document.getElementById('totalTimeSemester');
    const avgEl = document.getElementById('averageTimeDay');

    if (weekEl) weekEl.textContent = weekTime.toFixed(1) + 'h';
    if (monthEl) monthEl.textContent = monthTime.toFixed(1) + 'h';
    if (semesterEl) semesterEl.textContent = semesterTime.toFixed(1) + 'h';
    if (avgEl) avgEl.textContent = (weekTime / 7).toFixed(1) + 'h';

    // Time breakdown by course
    this.renderTimeBreakdownByCourse();
  },

  renderTimeBreakdownByCourse() {
    const container = document.getElementById('timeBreakdownByCourse');
    if (!container) return;

    const courseTimeMap = {};
    this.tasks
      .filter((t) => t.completed)
      .forEach((task) => {
        const time = task.estimatedTime || 0;
        if (!courseTimeMap[task.courseId]) {
          courseTimeMap[task.courseId] = 0;
        }
        courseTimeMap[task.courseId] += time;
      });

    const totalTime = Object.values(courseTimeMap).reduce((sum, time) => sum + time, 0);

    let html = '';
    this.courses.forEach((course) => {
      const courseTime = courseTimeMap[course.id] || 0;
      const percentage = totalTime > 0 ? ((courseTime / totalTime) * 100).toFixed(1) : 0;

      html += `
                <div style="margin: 15px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${course.name}</strong>
                        <span>${courseTime.toFixed(1)}h (${percentage}%)</span>
                    </div>
                    <div style="background: var(--border-color); height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: ${this.getCourseColor(course.id)}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
    });

    if (html === '') {
      html =
        '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No time data yet. Complete some assignments to see statistics!</p>';
    }

    container.innerHTML = html;
  },

  checkUpcomingReminders() {
    const now = new Date();
    const settings = this.loadReminderSettings();
    const upcomingTasks = this.tasks.filter((t) => !t.completed && new Date(t.dueDate) > now);

    let reminders = [];

    upcomingTasks.forEach((task) => {
      const dueDate = new Date(task.dueDate);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      if (settings.reminders7days && daysUntilDue === 7) {
        reminders.push({ task, days: 7 });
      }
      if (settings.reminders3days && daysUntilDue === 3) {
        reminders.push({ task, days: 3 });
      }
      if (settings.reminders1day && daysUntilDue === 1) {
        reminders.push({ task, days: 1 });
      }
      if (settings.remindersHighPriority && task.priority === 'high' && daysUntilDue <= 5) {
        reminders.push({ task, days: daysUntilDue, isHighPriority: true });
      }
    });

    return reminders;
  },

  renderUpcomingReminders() {
    const container = document.getElementById('upcomingRemindersList');
    if (!container) return;

    const reminders = this.checkUpcomingReminders();

    if (reminders.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No upcoming reminders</p>';
      return;
    }

    let html = '';
    reminders.forEach((reminder) => {
      const task = reminder.task;
      html += `
                <div style="background: var(--card-bg); padding: 15px; margin: 10px 0; border-radius: 10px; border-left: 4px solid ${reminder.isHighPriority ? 'var(--danger)' : 'var(--info)'};">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h4 style="margin: 0 0 5px 0;">${task.title}</h4>
                            <p style="color: var(--text-secondary); font-size: 0.9em; margin: 0;">${task.courseName}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: ${reminder.days <= 1 ? 'var(--danger)' : 'var(--warning)'};">
                                ${reminder.days} day${reminder.days !== 1 ? 's' : ''}
                            </div>
                            ${reminder.isHighPriority ? '<span style="font-size: 0.8em; color: var(--danger);">HIGH PRIORITY</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
    });

    container.innerHTML = html;
  },

  loadReminderSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('reminderSettings'));
      return (
        settings || {
          reminders7days: true,
          reminders3days: true,
          reminders1day: true,
          remindersHighPriority: true,
        }
      );
    } catch {
      return {
        reminders7days: true,
        reminders3days: true,
        reminders1day: true,
        remindersHighPriority: true,
      };
    }
  },

  saveReminderSettings() {
    const settings = {
      reminders7days: document.getElementById('reminders7days').checked,
      reminders3days: document.getElementById('reminders3days').checked,
      reminders1day: document.getElementById('reminders1day').checked,
      remindersHighPriority: document.getElementById('remindersHighPriority').checked,
    };
    localStorage.setItem('reminderSettings', JSON.stringify(settings));
    this.renderUpcomingReminders();
    this.showNotification('Reminder settings saved!', 'success');
  },
});
