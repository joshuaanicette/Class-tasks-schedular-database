// Assignment workspace controls. Existing task records and sync remain compatible.
Object.assign(TaskSchedulerPro.prototype, {
  setupAssignmentWorkspace() {
    this.selectedAssignmentIds = new Set();
    this.visibleAssignmentIds = new Set();
    this.assignmentUndoStack = [];
    this.assignmentView = 'all';
    let saved = {};
    try {
      const value = JSON.parse(localStorage.getItem('taskSchedulerAssignmentView') || '{}');
      if (value && typeof value === 'object') saved = value;
    } catch {
      /* A blocked or malformed preference must not prevent startup. */
    }
    this.assignmentTabActive = saved.active === true;
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.assignmentTabActive = tab.getAttribute('onclick')?.includes("'assignments'") || false;
        this.saveAssignmentView();
      });
    });
    if (this.courses.some((course) => course.id === saved.courseId))
      this.assignmentCourseId = saved.courseId;
    if (
      ['all', 'pending', 'completed', 'awaiting', 'graded', 'high', 'overdue'].includes(
        saved.filter,
      )
    )
      this.currentFilter = saved.filter;
    if (['date', 'priority', 'type', 'none'].includes(saved.grouping))
      document.getElementById('assignmentGrouping').value = saved.grouping;
    if (saved.view === 'week') this.assignmentView = 'week';
    const active = document.querySelector(`#assignments [data-filter="${this.currentFilter}"]`);
    if (active) this.setActiveFilter(active);
    this.updateAssignmentViewControls();

    document
      .getElementById('newAssignmentButton')
      .addEventListener('click', () => this.openAssignmentEditor());
    document.getElementById('cancelAssignmentEdit').addEventListener('click', () => {
      this.clearTaskForm();
      document.getElementById('newAssignmentButton').focus();
    });
    document.querySelectorAll('[data-assignment-view]').forEach((button) => {
      button.addEventListener('click', () => {
        this.assignmentView = button.dataset.assignmentView;
        // The focus view only contains unfinished work; reset incompatible filters.
        if (
          this.assignmentView === 'week' &&
          ['completed', 'awaiting', 'graded'].includes(this.currentFilter)
        ) {
          this.currentFilter = 'all';
          this.setActiveFilter(document.querySelector('#assignments [data-filter="all"]'));
        }
        this.updateAssignmentViewControls();
        this.renderTasks();
      });
    });
    document.getElementById('selectVisibleAssignments').addEventListener('change', (event) => {
      this.selectedAssignmentIds = event.target.checked
        ? new Set(this.visibleAssignmentIds)
        : new Set();
      document.querySelectorAll('#taskList [data-select-assignment]').forEach((input) => {
        input.checked = event.target.checked;
      });
      this.updateAssignmentSelection();
    });
    document.getElementById('clearAssignmentSelection').addEventListener('click', () => {
      this.selectedAssignmentIds.clear();
      this.renderTasks();
    });
    document.getElementById('assignmentBulkAction').addEventListener('change', (event) => {
      document.getElementById('bulkPriorityField').hidden = event.target.value !== 'priority';
      document.getElementById('bulkDueDateField').hidden = event.target.value !== 'dueDate';
    });
    document
      .getElementById('applyAssignmentBulk')
      .addEventListener('click', () => this.applyAssignmentBulk());
    document
      .getElementById('undoAssignmentAction')
      .addEventListener('click', () => this.undoAssignmentAction());
    document.getElementById('dismissAssignmentUndo').addEventListener('click', () => {
      this.assignmentUndoStack = [];
      this.renderAssignmentUndo();
    });
    const list = document.getElementById('taskList');
    list.addEventListener('change', (event) => {
      const input = event.target;
      const card = input.closest('[data-assignment-id]');
      if (!card) return;
      const id = Number(card.dataset.assignmentId);
      if (input.matches('[data-select-assignment]')) {
        if (input.checked) this.selectedAssignmentIds.add(id);
        else this.selectedAssignmentIds.delete(id);
        this.updateAssignmentSelection();
      }
    });
    list.addEventListener('submit', (event) => {
      const form = event.target.closest('[data-quick-assignment]');
      if (!form) return;
      event.preventDefault();
      const id = Number(form.closest('[data-assignment-id]').dataset.assignmentId);
      const task = this.tasks.find((item) => item.id === id);
      if (!task) return;
      const patch = {
        priority: form.elements.priority.value,
        grade: sanitizeInput(form.elements.grade.value.trim()),
        ...this.assignmentStatusPatch(task, form.elements.status.value),
      };
      this.applyAssignmentChanges([{ id, patch }], 'Quick edits saved');
      const nextFocus =
        document.querySelector(`#taskList [data-assignment-id="${id}"] summary`) ||
        document.getElementById('undoAssignmentAction');
      nextFocus.focus();
    });
  },

  openAssignmentEditor(editing = false) {
    editing = editing || Boolean(this.editingTaskId);
    const editor = document.getElementById('assignmentEditor');
    editor.open = true;
    document.getElementById('assignmentFormTitle').textContent = editing
      ? 'Edit Assignment'
      : 'Add New Assignment';
    document.getElementById('assignmentEditorToggle').textContent = editing
      ? 'Edit Assignment'
      : '＋ Add Assignment';
    if (!editing && !this.editingTaskId && this.assignmentCourseId != null) {
      document.getElementById('courseSelect').value = this.assignmentCourseId;
      this.updateCategorySelect(this.assignmentCourseId);
    }
    document.getElementById('taskTitle').focus();
    editor.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  },

  saveAssignmentView() {
    try {
      localStorage.setItem(
        'taskSchedulerAssignmentView',
        JSON.stringify({
          courseId: this.assignmentCourseId,
          filter: this.currentFilter,
          grouping: document.getElementById('assignmentGrouping').value,
          view: this.assignmentView,
          active: this.assignmentTabActive,
        }),
      );
    } catch {
      /* Viewing and filtering continue without local preference storage. */
    }
  },

  updateAssignmentViewControls() {
    document.querySelectorAll('[data-assignment-view]').forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.assignmentView === this.assignmentView),
      );
    });
    document.getElementById('assignmentViewHelp').textContent =
      this.assignmentView === 'week'
        ? 'Unfinished work: overdue, today, and the rest of this week through Sunday. Class, search, and status filters still apply.'
        : 'Browse all your assignments. Choose a class, status, or grouping to narrow the list.';
    document.getElementById('assignmentGrouping').disabled = this.assignmentView === 'week';
  },

  assignmentWeekBucket(task, now = new Date()) {
    const due = new Date(task.dueDate);
    if (due < now) return 'overdue';
    const days = window.SchedulerUtils.calendarDaysUntil(due, now);
    if (days === 0) return 'today';
    const remaining = (7 - now.getDay()) % 7;
    return days > 0 && days <= remaining ? 'upcoming' : null;
  },

  assignmentHasGrade(task) {
    return task.grade != null && String(task.grade).trim() !== '';
  },

  assignmentWorkStatus(task) {
    return task.completed ? (task.submitted ? 'submitted' : 'completed') : 'pending';
  },

  assignmentStatusPatch(task, status) {
    const completed = status !== 'pending';
    return {
      completed,
      submitted: status === 'submitted',
      completedAt: completed ? task.completedAt || new Date() : null,
      submittedAt: status === 'submitted' ? task.submittedAt || new Date() : null,
    };
  },

  assignmentQuickControls(task) {
    const esc = window.SchedulerUtils.escapeHtml;
    const status = this.assignmentWorkStatus(task);
    const label = { pending: 'Pending', completed: 'Completed', submitted: 'Submitted' }[status];
    const grading = this.assignmentHasGrade(task)
      ? 'Graded'
      : status === 'submitted'
        ? 'Awaiting grade'
        : 'No grade';
    return `<div class="assignment-card-tools">
      <label><input type="checkbox" data-select-assignment ${this.selectedAssignmentIds.has(task.id) ? 'checked' : ''} aria-label="Select ${esc(task.title)}" /> Select</label>
      <span class="assignment-status">${label} · ${grading}</span>
    </div>
    <details class="assignment-quick-edit"><summary>Quick edit</summary>
      <form data-quick-assignment aria-label="Quick edit ${esc(task.title)}">
        <label>Priority<select name="priority">${['high', 'medium', 'low'].map((value) => `<option value="${value}" ${task.priority === value ? 'selected' : ''}>${value[0].toUpperCase() + value.slice(1)}</option>`).join('')}</select></label>
        <label>Work status<select name="status">${['pending', 'completed', 'submitted'].map((value) => `<option value="${value}" ${status === value ? 'selected' : ''}>${value[0].toUpperCase() + value.slice(1)}</option>`).join('')}</select></label>
        <label>Grade (out of ${esc(task.maxPoints || 100)})<input name="grade" value="${esc(task.grade ?? '')}" placeholder="95, A-, 88%" /></label>
        <button type="submit">Save changes</button>
      </form>
    </details>`;
  },

  updateAssignmentSelection() {
    const size = this.selectedAssignmentIds.size;
    document.getElementById('assignmentSelectionCount').textContent = `${size} selected`;
    document.getElementById('applyAssignmentBulk').disabled = size === 0;
    document.getElementById('clearAssignmentSelection').disabled = size === 0;
    const select = document.getElementById('selectVisibleAssignments');
    select.disabled = this.visibleAssignmentIds.size === 0;
    select.checked = size > 0 && size === this.visibleAssignmentIds.size;
    select.indeterminate = size > 0 && size < this.visibleAssignmentIds.size;
  },

  applyAssignmentBulk() {
    const action = document.getElementById('assignmentBulkAction').value;
    const tasks = this.tasks.filter(
      (task) => this.selectedAssignmentIds.has(task.id) && this.visibleAssignmentIds.has(task.id),
    );
    if (!tasks.length) return;
    let value;
    if (action === 'dueDate') {
      const input = document.getElementById('bulkDueDate');
      value = new Date(input.value);
      if (!input.value || !Number.isFinite(value.getTime())) {
        this.showNotification('Choose a valid due date and time first.', 'error');
        input.focus();
        return;
      }
    } else if (action === 'priority') value = document.getElementById('bulkPriority').value;
    const changes = tasks.map((task) => ({
      id: task.id,
      patch: ['pending', 'completed', 'submitted'].includes(action)
        ? this.assignmentStatusPatch(task, action)
        : { [action]: value },
    }));
    this.selectedAssignmentIds.clear();
    this.applyAssignmentChanges(
      changes,
      `Updated ${tasks.length} assignment${tasks.length === 1 ? '' : 's'}`,
    );
  },

  applyAssignmentChanges(changes, label) {
    const entries = [];
    for (const change of changes) {
      const index = this.tasks.findIndex((task) => task.id === change.id);
      if (index < 0) continue;
      const task = this.tasks[index];
      if (change.remove) {
        entries.push({ id: task.id, removed: JSON.parse(JSON.stringify(task)), index });
        this.tasks.splice(index, 1);
      } else {
        // Store only changed fields so undo cannot overwrite unrelated subsequent edits.
        const fields = Object.keys(change.patch).filter(
          (key) => JSON.stringify(task[key]) !== JSON.stringify(change.patch[key]),
        );
        if (!fields.length) continue;
        const before = {},
          after = {};
        for (const key of fields) {
          before[key] =
            task[key] === undefined
              ? { absent: true }
              : { value: JSON.parse(JSON.stringify(task[key])) };
          after[key] = JSON.parse(JSON.stringify(change.patch[key]));
          task[key] = change.patch[key];
        }
        entries.push({ id: task.id, before, after });
      }
    }
    if (!entries.length) return;
    this.assignmentUndoStack.push({ label, entries });
    this.assignmentUndoStack = this.assignmentUndoStack.slice(-10);
    this.refreshAssignmentData();
    this.renderAssignmentUndo();
  },

  undoAssignmentAction() {
    const action = this.assignmentUndoStack.at(-1);
    if (!action) return;
    // Guard against cloud updates, imports, and course deletion after the original action.
    const safe = action.entries.every((entry) => {
      const task = this.tasks.find((item) => item.id === entry.id);
      if (entry.removed)
        return !task && this.courses.some((course) => course.id === entry.removed.courseId);
      return (
        task &&
        Object.entries(entry.after).every(
          ([key, value]) => JSON.stringify(task[key]) === JSON.stringify(value),
        )
      );
    });
    if (!safe) {
      this.assignmentUndoStack.pop();
      this.renderAssignmentUndo();
      this.showNotification(
        'This assignment changed since that action. Undo was skipped to keep the newer changes.',
        'info',
      );
      return;
    }
    for (const entry of [...action.entries].reverse()) {
      if (entry.removed) {
        this.tasks.splice(entry.index, 0, ...window.SchedulerUtils.restoreTasks([entry.removed]));
      } else {
        const task = this.tasks.find((item) => item.id === entry.id);
        for (const [key, original] of Object.entries(entry.before)) {
          if (original.absent) delete task[key];
          else task[key] = key === 'dueDate' ? new Date(original.value) : original.value;
        }
      }
    }
    this.assignmentUndoStack.pop();
    this.refreshAssignmentData();
    this.renderAssignmentUndo();
    this.showNotification('Action undone', 'success');
  },

  renderAssignmentUndo() {
    const action = this.assignmentUndoStack.at(-1);
    document.getElementById('assignmentUndo').hidden = !action;
    document.getElementById('assignmentUndoMessage').textContent = action?.label || '';
  },

  refreshAssignmentData() {
    this.saveTasks();
    this.renderTasks();
    this.renderCourses();
    this.renderCalendar();
    this.renderTodayAssignments();
    this.updateStats();
    this.renderProgress();
    this.renderTimeStatistics();
    this.renderUpcomingReminders();
    this.renderGradeCalculator();
    this.renderWhatIfCalculator();
  },
});
