// Tasks behavior, installed before the scheduler is constructed.
Object.assign(TaskSchedulerPro.prototype, {
  setupTagInput() {
    const tagInput = document.getElementById('tagInput');
    const tagsContainer = document.getElementById('tagsContainer');

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const tag = tagInput.value.trim();
        if (tag && !this.tags.includes(tag)) {
          this.tags.push(tag);
          this.renderTags(tagsContainer, this.tags, (tagToRemove) => {
            this.tags = this.tags.filter((t) => t !== tagToRemove);
            this.renderTags(tagsContainer, this.tags, arguments.callee);
          });
          tagInput.value = '';
        }
      }
    });
  },

  renderTags(container, tags, removeCallback) {
    const input = container.querySelector('.tag-input');
    const existingTags = container.querySelectorAll('.tag');
    existingTags.forEach((tag) => tag.remove());

    tags.forEach((tag) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.innerHTML = `${tag} <span class="tag-remove">×</span>`;
      tagEl.querySelector('.tag-remove').addEventListener('click', () => {
        removeCallback(tag);
      });
      container.insertBefore(tagEl, input);
    });
  },

  autoMapTypeToCategory(type, courseId) {
    // Map assignment types to common grade category names
    // ORDER MATTERS: Most specific categories first, then general fallbacks
    const typeMapping = {
      midterm: ['Midterms', 'Midterm', 'Exams', 'Exam', 'Tests', 'Test'],
      final: ['Finals', 'Final', 'Exams', 'Exam', 'Tests', 'Test'],
      exam: ['Exams', 'Exam', 'Tests', 'Test'],
      quiz: ['Quizzes', 'Quiz'],
      assignment: ['Assignments', 'Assignment', 'Homework', 'HW'],
      project: ['Projects', 'Project'],
      homework: ['Homework', 'HW', 'Assignments', 'Assignment'],
      lab: ['Labs', 'Lab', 'Lab Work'],
      paper: ['Papers', 'Paper', 'Essays', 'Essay', 'Writing'],
      presentation: ['Presentations', 'Presentation'],
      reading: ['Reading', 'Readings'],
      other: null,
    };

    const course = this.courses.find((c) => c.id === courseId);
    if (!course || !course.gradeCategories || course.gradeCategories.length === 0) {
      return null;
    }

    // Find matching category - checks in priority order
    const possibleNames = typeMapping[type.toLowerCase()] || [];
    for (const categoryName of possibleNames) {
      const found = course.gradeCategories.find(
        (cat) => cat.name.toLowerCase() === categoryName.toLowerCase(),
      );
      if (found) return found.name;
    }

    return null; // No matching category found
  },

  addTask() {
    const title = sanitizeInput(document.getElementById('taskTitle').value.trim());
    const courseId = parseInt(document.getElementById('courseSelect').value);
    const type = document.getElementById('assignmentType').value;
    let category = document.getElementById('categorySelect').value;
    const dueDate = document.getElementById('dueDate').value;
    const priority = document.getElementById('priority').value;
    const description = sanitizeInput(document.getElementById('description').value.trim());
    const estimatedTime = parseFloat(document.getElementById('estimatedTime').value) || 0;
    const grade = sanitizeInput(document.getElementById('assignmentGrade').value.trim());
    const maxPoints = parseFloat(document.getElementById('maxPoints').value) || 100;
    const attachments = document
      .getElementById('attachmentUrl')
      .value.split('\n')
      .filter((url) => url.trim());

    if (!title || !courseId || !dueDate || !type) {
      this.showNotification('Fill in required fields', 'error');
      return;
    }

    const course = this.courses.find((c) => c.id === courseId);
    if (!course) return;

    // Auto-assign category if not manually selected
    if (!category) {
      category = this.autoMapTypeToCategory(type, courseId);
    }

    const task = {
      id: Date.now(),
      title,
      courseId,
      courseName: course.name,
      type,
      category,
      dueDate: new Date(dueDate),
      priority,
      description,
      estimatedTime,
      grade,
      maxPoints,
      tags: [...this.tags],
      attachments,
      completed: false,
      createdAt: new Date(),
    };

    this.tasks.push(task);
    this.saveTasks();
    this.renderTasks();
    this.renderCourses();
    this.renderCalendar();
    this.renderTodayAssignments();
    this.updateStats();
    this.clearTaskForm();

    // Format type name for notification
    const typeNames = {
      midterm: 'Midterm Exam',
      final: 'Final Exam',
      exam: 'Exam',
      quiz: 'Quiz',
      assignment: 'Assignment',
      project: 'Project',
      homework: 'Homework',
      lab: 'Lab',
      reading: 'Reading',
      presentation: 'Presentation',
      paper: 'Paper/Essay',
      other: 'Other',
    };
    const typeName = typeNames[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);

    this.showNotification(
      `${typeName} added!${category ? ' (Auto-assigned to ' + category + ')' : ''}`,
      'success',
    );
  },

  editTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Populate form fields
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('courseSelect').value = task.courseId;
    document.getElementById('assignmentType').value = task.type || 'assignment';
    document.getElementById('description').value = task.description || '';
    document.getElementById('priority').value = task.priority;
    document.getElementById('estimatedTime').value = task.estimatedTime || '';
    document.getElementById('assignmentGrade').value = task.grade || '';
    document.getElementById('maxPoints').value = task.maxPoints || 100;

    // Set due date
    const dueDate = new Date(task.dueDate);
    const localISOTime = new Date(dueDate - dueDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    document.getElementById('dueDate').value = localISOTime;

    // Update category select and set category
    this.updateCategorySelect(task.courseId);
    document.getElementById('categorySelect').value = task.category || '';

    // Set tags
    this.tags = task.tags ? [...task.tags] : [];
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) {
      this.renderTags(tagsContainer, this.tags, (tagToRemove) => {
        this.tags = this.tags.filter((t) => t !== tagToRemove);
        this.renderTags(tagsContainer, this.tags, arguments.callee);
      });
    }

    // Set attachments
    if (task.attachments && task.attachments.length > 0) {
      document.getElementById('attachmentUrl').value = task.attachments.join('\n');
    }

    // Store the ID for updating
    this.editingTaskId = taskId;

    // Change button text
    const addButton = document.querySelector('#assignments .add-btn');
    if (addButton) {
      addButton.textContent = '💾 Update Assignment';
    }

    // Switch to assignments tab and scroll to form
    document.querySelector('[onclick*="assignments"]').click();
    setTimeout(() => {
      document.querySelector('#assignments .form-section').scrollIntoView({ behavior: 'smooth' });
    }, 100);

    this.showNotification('Editing assignment - update when ready', 'info');
  },

  updateTask() {
    if (!this.editingTaskId) return;

    const title = sanitizeInput(document.getElementById('taskTitle').value.trim());
    const courseId = parseInt(document.getElementById('courseSelect').value);
    const type = document.getElementById('assignmentType').value;
    let category = document.getElementById('categorySelect').value;
    const dueDate = document.getElementById('dueDate').value;
    const priority = document.getElementById('priority').value;
    const description = sanitizeInput(document.getElementById('description').value.trim());
    const estimatedTime = parseFloat(document.getElementById('estimatedTime').value) || 0;
    const grade = sanitizeInput(document.getElementById('assignmentGrade').value.trim());
    const maxPoints = parseFloat(document.getElementById('maxPoints').value) || 100;
    const attachments = document
      .getElementById('attachmentUrl')
      .value.split('\n')
      .filter((url) => url.trim());

    if (!title || !courseId || !dueDate || !type) {
      this.showNotification('Fill in required fields', 'error');
      return;
    }

    const course = this.courses.find((c) => c.id === courseId);
    if (!course) return;

    // Auto-assign category if not manually selected
    if (!category) {
      category = this.autoMapTypeToCategory(type, courseId);
    }

    // Find and update the task
    const taskIndex = this.tasks.findIndex((t) => t.id === this.editingTaskId);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = {
        ...this.tasks[taskIndex],
        title,
        courseId,
        courseName: course.name,
        type,
        category,
        dueDate: new Date(dueDate),
        priority,
        description,
        estimatedTime,
        grade,
        maxPoints,
        tags: [...this.tags],
        attachments,
      };

      this.saveTasks();
      this.renderTasks();
      this.renderCourses();
      this.renderCalendar();
      this.renderTodayAssignments();
      this.updateStats();
      this.clearTaskForm();

      // Reset button
      const addButton = document.querySelector('#assignments .add-btn');
      if (addButton) {
        addButton.textContent = '➕ Add Assignment';
      }
      this.editingTaskId = null;

      this.showNotification('Assignment updated!', 'success');
    }
  },

  updateCategorySelect(courseId) {
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '<option value="">Auto-assign from type</option>';

    if (!courseId) return;

    const course = this.courses.find((c) => c.id === courseId);
    if (course && course.gradeCategories) {
      course.gradeCategories.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = `${cat.name} (${cat.weight}%)`;
        categorySelect.appendChild(option);
      });
    }
  },

  completeTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    if (task.completed) {
      task.completedAt = new Date();
    }
    this.saveTasks();
    this.renderTasks();
    this.renderCourses();
    this.renderCalendar();
    this.renderTodayAssignments();
    this.updateStats();
    this.renderTimeStatistics();
    this.showNotification(task.completed ? 'Completed!' : 'Marked pending', 'success');
  },

  deleteTask(id) {
    if (!confirm('Delete this assignment?')) return;

    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.saveTasks();
    this.renderTasks();
    this.renderCourses();
    this.renderCalendar();
    this.renderTodayAssignments();
    this.updateStats();
    this.showNotification('Assignment deleted', 'success');
  },

  renderTasks() {
    const taskList = document.getElementById('taskList');
    let filteredTasks = this.getFilteredTasks();

    if (this.searchTerm) {
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(this.searchTerm) ||
          task.courseName.toLowerCase().includes(this.searchTerm) ||
          (task.description && task.description.toLowerCase().includes(this.searchTerm)) ||
          (task.tags && task.tags.some((tag) => tag.toLowerCase().includes(this.searchTerm))) ||
          (task.type && task.type.toLowerCase().includes(this.searchTerm)) ||
          (task.category && task.category.toLowerCase().includes(this.searchTerm)),
      );
    }

    if (filteredTasks.length === 0) {
      taskList.innerHTML = '<div class="empty-state"><h3>No assignments found</h3></div>';
      return;
    }

    filteredTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed - b.completed;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    taskList.innerHTML = filteredTasks.map((task) => this.createTaskHTML(task)).join('');
  },

  createTaskHTML(task) {
    const dueDate = new Date(task.dueDate);
    const isOverdue = !task.completed && dueDate < new Date();
    const dueDateClass = isOverdue ? 'overdue' : '';

    const categoryBadge = task.category
      ? `<span class="tag" style="background: var(--info);">${task.category}</span>`
      : '';

    // Format type name for display
    const formatTypeName = (type) => {
      const typeNames = {
        midterm: 'Midterm Exam',
        final: 'Final Exam',
        exam: 'Exam',
        quiz: 'Quiz',
        assignment: 'Assignment',
        project: 'Project',
        homework: 'Homework',
        lab: 'Lab',
        reading: 'Reading',
        presentation: 'Presentation',
        paper: 'Paper/Essay',
        other: 'Other',
      };
      return typeNames[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
    };

    const metadataHTML = `
            <div class="task-metadata">
                ${task.type ? `<div class="metadata-item"><span class="metadata-label">📝</span>${formatTypeName(task.type)}</div>` : ''}
                ${task.estimatedTime ? `<div class="metadata-item"><span class="metadata-label">⏱️</span>${task.estimatedTime}h</div>` : ''}
                ${task.grade ? `<div class="metadata-item"><span class="metadata-label">📊</span>${task.grade}/${task.maxPoints || 100}</div>` : ''}
                ${task.category ? `<div class="metadata-item"><span class="metadata-label">📁</span>${task.category}</div>` : ''}
            </div>
        `;

    const tagsHTML =
      task.tags && task.tags.length > 0
        ? `
            <div class="task-tags">
                ${task.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
            </div>
        `
        : '';

    return `
            <div class="task-item ${task.priority}-priority ${task.completed ? 'completed' : ''}">
                <div class="task-header">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-course">${task.courseName}</span>
                </div>
                ${task.description ? `<div class="task-details">${task.description}</div>` : ''}
                ${tagsHTML}
                ${metadataHTML}
                <div class="task-meta">
                    <div class="task-due ${dueDateClass}">
                        📅 ${this.formatDateTime(dueDate)}
                        ${isOverdue ? ' (Overdue!)' : ''}
                    </div>
                    <div class="task-actions">
                        <button class="task-btn complete-btn" onclick="taskScheduler.completeTask(${task.id})">
                            ${task.completed ? '↩️' : '✅'}
                        </button>
                        <button class="task-btn edit-task-btn" onclick="taskScheduler.editTask(${task.id})">✏️</button>
                        <button class="task-btn delete-btn" onclick="taskScheduler.deleteTask(${task.id})">🗑️</button>
                    </div>
                </div>
            </div>
        `;
  },

  getFilteredTasks() {
    const now = new Date();
    return this.tasks.filter((task) => {
      switch (this.currentFilter) {
        case 'pending':
          return !task.completed;
        case 'completed':
          return task.completed;
        case 'high':
          return task.priority === 'high' && !task.completed;
        case 'overdue':
          return !task.completed && new Date(task.dueDate) < now;
        default:
          return true;
      }
    });
  },

  updateStats() {
    const now = new Date();
    const total = this.tasks.length;
    const pending = this.tasks.filter((t) => !t.completed).length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const overdue = this.tasks.filter((t) => !t.completed && new Date(t.dueDate) < now).length;

    document.getElementById('totalTasks').textContent = total;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('overdueTasks').textContent = overdue;
  },

  setActiveFilter(activeBtn) {
    document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
    activeBtn.classList.add('active');
  },

  setMinDateTime() {
    const now = new Date();
    const localISOTime = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('dueDate').min = localISOTime;
  },

  formatDateTime(date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  },

  clearTaskForm() {
    document.getElementById('taskForm').reset();
    this.tags = [];
    this.setMinDateTime();

    // Clear tags display
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) {
      this.renderTags(tagsContainer, [], () => {});
    }

    // Always reset to add mode
    const addButton = document.querySelector('#assignments .add-btn');
    if (addButton) {
      addButton.textContent = '➕ Add Assignment';
    }
    this.editingTaskId = null;
  },
});
