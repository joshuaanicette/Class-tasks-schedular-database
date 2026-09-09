class TaskSchedulerPro {
  constructor() {
    this.courses = this.loadCourses();
    this.tasks = this.loadTasks();
    this.archives = this.loadArchives();
    this.currentFilter = 'all';
    this.notificationPermission = false;
    this.searchTerm = '';
    this.currentMonth = new Date();
    this.tags = [];
    this.editTags = [];
    this.tempCategories = [];
    this.tempEditCategories = [];
    this.syllabusText = '';
    this.editingCourseId = null;
    this.editingTaskId = null;
    this.courseColors = {};
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderCourses();
    this.renderTasks();
    this.updateStats();
    this.updateCourseSelect();
    this.updateGradeCalcCourseSelect();
    this.updateWhatIfCourseSelect();
    this.setMinDateTime();
    this.renderCalendar();
    this.renderProgress();
    this.renderArchive();
    this.renderWeeklySchedule();
    this.renderTimeStatistics();
    this.renderUpcomingReminders();
    this.setupTagInput();
  }

  setupEventListeners() {
    // Course form
    document.getElementById('courseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.editingCourseId) {
        this.updateCourse();
      } else {
        this.addCourse();
      }
    });

    // Task form
    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.editingTaskId) {
        this.updateTask();
      } else {
        this.addTask();
      }
    });

    // Syllabus upload
    document.getElementById('syllabusFile').addEventListener('change', (e) => {
      this.handleSyllabusUpload(e.target.files[0]);
    });

    // Search
    document.getElementById('globalSearch').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.renderCourses();
      this.renderTasks();

      // Show/hide clear button and status
      const clearBtn = document.getElementById('clearSearch');
      const statusDiv = document.getElementById('searchStatus');

      if (this.searchTerm) {
        clearBtn.style.display = 'block';
        statusDiv.style.display = 'block';

        const courseCount = this.courses.filter(
          (course) =>
            course.name.toLowerCase().includes(this.searchTerm) ||
            course.code.toLowerCase().includes(this.searchTerm) ||
            (course.instructor && course.instructor.toLowerCase().includes(this.searchTerm)),
        ).length;

        const taskCount = this.tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(this.searchTerm) ||
            task.courseName.toLowerCase().includes(this.searchTerm) ||
            (task.description && task.description.toLowerCase().includes(this.searchTerm)) ||
            (task.tags && task.tags.some((tag) => tag.toLowerCase().includes(this.searchTerm))) ||
            (task.type && task.type.toLowerCase().includes(this.searchTerm)) ||
            (task.category && task.category.toLowerCase().includes(this.searchTerm)),
        ).length;

        statusDiv.textContent = `Found ${courseCount} course${courseCount !== 1 ? 's' : ''} and ${taskCount} assignment${taskCount !== 1 ? 's' : ''} matching "${e.target.value}"`;
      } else {
        clearBtn.style.display = 'none';
        statusDiv.style.display = 'none';
      }
    });

    // Clear search button
    document.getElementById('clearSearch').addEventListener('click', () => {
      document.getElementById('globalSearch').value = '';
      this.searchTerm = '';
      this.renderCourses();
      this.renderTasks();
      document.getElementById('clearSearch').style.display = 'none';
      document.getElementById('searchStatus').style.display = 'none';
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.setActiveFilter(e.target);
        this.currentFilter = e.target.dataset.filter;
        this.renderTasks();
      });
    });

    // Modals
    document.querySelectorAll('.close').forEach((closeBtn) => {
      closeBtn.addEventListener('click', () => {
        document.getElementById('courseModal').style.display = 'none';
        document.getElementById('taskModal').style.display = 'none';
      });
    });

    // Course select for assignments
    document.getElementById('courseSelect').addEventListener('change', (e) => {
      this.updateCategorySelect(parseInt(e.target.value));
    });
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification-popup';
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notification.style.background =
      type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}
