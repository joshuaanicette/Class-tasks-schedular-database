// Scheduled assessments + weekly assignment tracker.
(function () {
  'use strict';

  const ASSESSMENT_TYPES = new Set(['quiz', 'test', 'exam', 'midterm', 'final']);
  const TYPE_META = {
    quiz: { label: 'Quiz', icon: '🧠' },
    test: { label: 'Test', icon: '📝' },
    exam: { label: 'Exam', icon: '📋' },
    midterm: { label: 'Midterm Exam', icon: '📚' },
    final: { label: 'Final Exam', icon: '🎓' },
    assignment: { label: 'Assignment', icon: '📄' },
    homework: { label: 'Homework', icon: '✏️' },
    project: { label: 'Project', icon: '🛠️' },
    lab: { label: 'Lab', icon: '🧪' },
    reading: { label: 'Reading', icon: '📖' },
    presentation: { label: 'Presentation', icon: '🗣️' },
    paper: { label: 'Paper/Essay', icon: '📰' },
    other: { label: 'Other', icon: '📌' },
  };

  let weekOffset = 0;

  function app() {
    try {
      return typeof taskScheduler !== 'undefined' ? taskScheduler : null;
    } catch (_) {
      return null;
    }
  }

  const { escapeHtml } = window.SchedulerUtils;

  function isAssessmentType(type) {
    return ASSESSMENT_TYPES.has(String(type || '').toLowerCase());
  }

  function ensureTestOption() {
    const select = document.getElementById('assignmentType');
    if (!select || select.querySelector('option[value="test"]')) return;
    const option = document.createElement('option');
    option.value = 'test';
    option.textContent = 'Test';
    const examOption = select.querySelector('option[value="exam"]');
    if (examOption) examOption.insertAdjacentElement('afterend', option);
    else select.appendChild(option);
  }

  function injectStyles() {
    if (document.getElementById('v7AssessmentStyles')) return;
    const style = document.createElement('style');
    style.id = 'v7AssessmentStyles';
    style.textContent = `
            .v7-assessment-panel{margin:0 0 18px;padding:14px;border:1px solid var(--border-color);border-radius:12px;background:var(--hover-bg)}
            .v7-assessment-panel[hidden]{display:none!important}
            .v7-assessment-heading{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:11px}
            .v7-assessment-heading strong{color:var(--text-primary)}
            .v7-assessment-heading span{font-size:.78rem;color:var(--text-secondary)}
            .v7-assessment-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
            .v7-assessment-fields label{display:grid;gap:5px;color:var(--text-secondary);font-size:.76rem;font-weight:700}
            .v7-assessment-fields input{width:100%;min-height:40px;padding:8px 10px;border:1px solid var(--border-color);border-radius:9px;background:var(--card-bg);color:var(--text-primary)}
            .v7-assessment-note{margin-top:9px;font-size:.75rem;color:var(--text-secondary)}
            .v7-hidden-due{display:none!important}
            .v7-assessment-inline{margin:8px 0;padding:8px 10px;border-radius:9px;border:1px solid var(--border-color);background:var(--hover-bg);display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:var(--text-secondary);font-size:.78rem}
            .v7-assessment-inline strong{color:var(--text-primary)}
            .v7-weekly-tracker{margin:0 0 22px;padding:16px;border:1px solid var(--border-color);border-radius:14px;background:var(--card-bg)}
            .v7-week-header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
            .v7-week-title h3{margin:0 0 4px;color:var(--text-primary)}
            .v7-week-title p{margin:0;color:var(--text-secondary);font-size:.8rem}
            .v7-week-controls{display:flex;gap:7px;flex-wrap:wrap}
            .v7-week-controls button{border:1px solid var(--border-color);background:var(--hover-bg);color:var(--text-primary);padding:7px 10px;border-radius:8px;cursor:pointer}
            .v7-week-controls button:hover{border-color:var(--accent);color:var(--accent)}
            .v7-week-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
            .v7-stat{padding:9px 10px;border:1px solid var(--border-color);border-radius:9px;background:var(--hover-bg)}
            .v7-stat small,.v7-stat strong{display:block}.v7-stat small{color:var(--text-secondary);font-size:.68rem}.v7-stat strong{margin-top:2px;color:var(--text-primary)}
            .v7-week-grid{display:grid;grid-template-columns:repeat(7,minmax(145px,1fr));gap:8px;overflow-x:auto;padding-bottom:4px}
            .v7-day{min-width:145px;border:1px solid var(--border-color);border-radius:10px;background:var(--card-bg);padding:9px}
            .v7-day.is-today{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
            .v7-day h4{margin:0 0 7px;color:var(--text-primary);font-size:.78rem;display:flex;justify-content:space-between;gap:5px}
            .v7-day h4 span{color:var(--text-secondary);font-weight:500}
            .v7-week-task{display:grid;gap:4px;padding:7px;margin-bottom:6px;border-radius:8px;background:var(--hover-bg);border-left:3px solid var(--accent);cursor:pointer}
            .v7-week-task:last-child{margin-bottom:0}.v7-week-task.completed{opacity:.58}.v7-week-task.assessment{border-left-width:5px}
            .v7-week-task-top{display:flex;justify-content:space-between;align-items:flex-start;gap:5px}
            .v7-week-task strong{font-size:.72rem;color:var(--text-primary);line-height:1.25}.v7-week-task small{font-size:.65rem;color:var(--text-secondary)}
            .v7-type-pill{font-size:.58rem!important;padding:2px 5px;border:1px solid var(--border-color);border-radius:999px;background:var(--card-bg);white-space:nowrap}
            .v7-week-task time{font-size:.66rem;color:var(--accent);font-weight:750}
            .v7-empty-day{font-size:.68rem;color:var(--text-secondary);text-align:center;padding:8px 3px}
            @media(max-width:900px){.v7-week-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.v7-assessment-fields{grid-template-columns:1fr}.v7-week-grid{grid-template-columns:repeat(7,minmax(135px,1fr))}}
        `;
    document.head.appendChild(style);
  }

  function injectAssessmentPanel() {
    const due = document.getElementById('dueDate');
    if (!due || document.getElementById('v7AssessmentPanel')) return;
    const row = due.closest('.form-row');
    if (!row) return;

    const panel = document.createElement('div');
    panel.id = 'v7AssessmentPanel';
    panel.className = 'v7-assessment-panel';
    panel.hidden = true;
    panel.innerHTML = `
            <div class="v7-assessment-heading">
                <strong>🗓️ Scheduled Assessment</strong>
                <span>Required for quizzes, tests, and exams</span>
            </div>
            <div class="v7-assessment-fields">
                <label>Assessment date<input type="date" id="v7AssessmentDate"></label>
                <label>Start time<input type="time" id="v7AssessmentStart"></label>
                <label>End time<input type="time" id="v7AssessmentEnd"></label>
            </div>
            <div class="v7-assessment-note">The normal assignment due date is synchronized to the assessment start time so reminders, calendar entries, and sorting continue to work.</div>`;
    row.insertAdjacentElement('afterend', panel);

    ['v7AssessmentDate', 'v7AssessmentStart', 'v7AssessmentEnd'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', syncAssessmentToDueDate);
    });
  }

  function assignmentType() {
    return String(document.getElementById('assignmentType')?.value || '').toLowerCase();
  }

  function syncAssessmentToDueDate() {
    if (!isAssessmentType(assignmentType())) return;
    const date = document.getElementById('v7AssessmentDate')?.value || '';
    const start = document.getElementById('v7AssessmentStart')?.value || '';
    const due = document.getElementById('dueDate');
    if (due && date && start) due.value = `${date}T${start}`;
  }

  function refreshAssessmentUI(task) {
    ensureTestOption();
    injectAssessmentPanel();
    const type = assignmentType();
    const assessment = isAssessmentType(type);
    const panel = document.getElementById('v7AssessmentPanel');
    const due = document.getElementById('dueDate');
    const dueGroup = due?.closest('.form-group');
    if (panel) panel.hidden = !assessment;
    dueGroup?.classList.toggle('v7-hidden-due', assessment);
    if (due) due.required = !assessment;

    if (task && assessment) {
      const taskDate = new Date(task.dueDate);
      const fallbackDate = Number.isNaN(taskDate.getTime())
        ? ''
        : [
            taskDate.getFullYear(),
            String(taskDate.getMonth() + 1).padStart(2, '0'),
            String(taskDate.getDate()).padStart(2, '0'),
          ].join('-');
      const fallbackTime = Number.isNaN(taskDate.getTime())
        ? ''
        : `${String(taskDate.getHours()).padStart(2, '0')}:${String(taskDate.getMinutes()).padStart(2, '0')}`;
      const date = document.getElementById('v7AssessmentDate');
      const start = document.getElementById('v7AssessmentStart');
      const end = document.getElementById('v7AssessmentEnd');
      if (date) date.value = task.assessmentDate || fallbackDate;
      if (start) start.value = task.assessmentStartTime || fallbackTime;
      if (end) end.value = task.assessmentEndTime || '';
      syncAssessmentToDueDate();
    }
  }

  function clearAssessmentFields() {
    ['v7AssessmentDate', 'v7AssessmentStart', 'v7AssessmentEnd'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
    refreshAssessmentUI();
  }

  function scheduleDraft() {
    const type = assignmentType();
    if (!isAssessmentType(type)) return null;
    return {
      type,
      assessmentDate: document.getElementById('v7AssessmentDate')?.value || '',
      assessmentStartTime: document.getElementById('v7AssessmentStart')?.value || '',
      assessmentEndTime: document.getElementById('v7AssessmentEnd')?.value || '',
    };
  }

  function timeMinutes(value) {
    if (!/^\d{1,2}:\d{2}$/.test(String(value || ''))) return null;
    const [h, m] = String(value).split(':').map(Number);
    return h * 60 + m;
  }

  function validateAssessment(draft) {
    if (!draft) return true;
    const scheduler = app();
    if (!draft.assessmentDate || !draft.assessmentStartTime || !draft.assessmentEndTime) {
      scheduler?.showNotification(
        'Quiz/Test/Exam requires a date, start time, and end time.',
        'error',
      );
      return false;
    }
    const start = timeMinutes(draft.assessmentStartTime);
    const end = timeMinutes(draft.assessmentEndTime);
    if (start == null || end == null || end <= start) {
      scheduler?.showNotification(
        'Assessment end time must be later than the start time.',
        'error',
      );
      return false;
    }
    syncAssessmentToDueDate();
    return Boolean(document.getElementById('dueDate')?.value);
  }

  function applyAssessmentMetadata(task, draft) {
    if (!task) return;
    if (!draft) {
      delete task.scheduledAssessment;
      delete task.assessmentDate;
      delete task.assessmentStartTime;
      delete task.assessmentEndTime;
      return;
    }
    task.scheduledAssessment = true;
    task.assessmentDate = draft.assessmentDate;
    task.assessmentStartTime = draft.assessmentStartTime;
    task.assessmentEndTime = draft.assessmentEndTime;
    task.dueDate = new Date(`${draft.assessmentDate}T${draft.assessmentStartTime}`);
  }

  function formatClock(value) {
    if (!value) return '';
    const [h, m] = String(value).split(':').map(Number);
    if (!Number.isFinite(h)) return value;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
  }

  function durationText(start, end) {
    const a = timeMinutes(start);
    const b = timeMinutes(end);
    if (a == null || b == null || b <= a) return '';
    const mins = b - a;
    const hours = Math.floor(mins / 60);
    const rest = mins % 60;
    if (hours && rest) return `${hours}h ${rest}m`;
    if (hours) return `${hours}h`;
    return `${rest}m`;
  }

  function assessmentScheduleText(task) {
    if (!task || !isAssessmentType(task.type)) return '';
    const date = task.assessmentDate || '';
    const start = task.assessmentStartTime || '';
    const end = task.assessmentEndTime || '';
    const range =
      start && end ? `${formatClock(start)}–${formatClock(end)}` : start ? formatClock(start) : '';
    const duration = durationText(start, end);
    const dateText = date
      ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : '';
    return [dateText, range, duration ? `(${duration})` : ''].filter(Boolean).join(' · ');
  }

  function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff + weekOffset * 7);
    return d;
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function injectWeeklyTracker() {
    const assignments = document.getElementById('assignments');
    const taskList = document.getElementById('taskList');
    if (!assignments || !taskList || document.getElementById('v7WeeklyTracker')) return;
    const tasksSection = taskList.closest('.tasks-section');
    if (!tasksSection) return;
    const tracker = document.createElement('div');
    tracker.id = 'v7WeeklyTracker';
    tracker.className = 'v7-weekly-tracker';
    tasksSection.insertAdjacentElement('beforebegin', tracker);
  }

  function taskTimeLabel(task) {
    if (isAssessmentType(task.type)) {
      return task.assessmentStartTime
        ? assessmentScheduleText(task).split(' · ').slice(1).join(' · ')
        : new Date(task.dueDate).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
    }
    return `Due ${new Date(task.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  function renderWeeklyTracker() {
    injectWeeklyTracker();
    const tracker = document.getElementById('v7WeeklyTracker');
    const scheduler = app();
    if (!tracker || !scheduler) return;

    const monday = startOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    const tasks = (scheduler.tasks || [])
      .filter((task) => {
        const d = new Date(task.dueDate);
        return d >= monday && d < nextMonday;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const remaining = tasks.filter((t) => !t.completed).length;
    const completed = tasks.filter((t) => t.completed).length;
    const assessments = tasks.filter((t) => isAssessmentType(t.type)).length;
    const rangeText = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const today = new Date();

    tracker.innerHTML = `
            <div class="v7-week-header">
                <div class="v7-week-title"><h3>📆 Weekly Assignments Tracker</h3><p>${rangeText} · includes Saturday and Sunday assignments</p></div>
                <div class="v7-week-controls">
                    <button type="button" data-v7-week="prev">← Previous</button>
                    <button type="button" data-v7-week="today">This Week</button>
                    <button type="button" data-v7-week="next">Next →</button>
                </div>
            </div>
            <div class="v7-week-stats">
                <div class="v7-stat"><small>Total this week</small><strong>${tasks.length}</strong></div>
                <div class="v7-stat"><small>Remaining</small><strong>${remaining}</strong></div>
                <div class="v7-stat"><small>Completed</small><strong>${completed}</strong></div>
                <div class="v7-stat"><small>Quizzes / Tests / Exams</small><strong>${assessments}</strong></div>
            </div>
            <div class="v7-week-grid">
                ${days
                  .map((day) => {
                    const dayTasks = tasks.filter((task) => sameDay(new Date(task.dueDate), day));
                    return `<div class="v7-day ${sameDay(day, today) ? 'is-today' : ''}">
                        <h4>${day.toLocaleDateString('en-US', { weekday: 'short' })}<span>${day.getMonth() + 1}/${day.getDate()}</span></h4>
                        ${
                          dayTasks.length
                            ? dayTasks
                                .map((task) => {
                                  const meta =
                                    TYPE_META[String(task.type || '').toLowerCase()] ||
                                    TYPE_META.other;
                                  const assessment = isAssessmentType(task.type);
                                  return `<div class="v7-week-task ${task.completed ? 'completed' : ''} ${assessment ? 'assessment' : ''}" data-v7-task-id="${task.id}">
                                <div class="v7-week-task-top"><strong>${escapeHtml(task.title)}</strong><small class="v7-type-pill">${meta.icon} ${meta.label}</small></div>
                                <small>${escapeHtml(task.courseName || '')}</small>
                                <time>${escapeHtml(taskTimeLabel(task))}</time>
                            </div>`;
                                })
                                .join('')
                            : '<div class="v7-empty-day">No assignments</div>'
                        }
                    </div>`;
                  })
                  .join('')}
            </div>`;

    tracker.querySelectorAll('[data-v7-week]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.v7Week;
        if (action === 'prev') weekOffset -= 1;
        if (action === 'next') weekOffset += 1;
        if (action === 'today') weekOffset = 0;
        renderWeeklyTracker();
      });
    });
    tracker.querySelectorAll('[data-v7-task-id]').forEach((card) => {
      card.addEventListener('click', () => scheduler.editTask?.(Number(card.dataset.v7TaskId)));
    });
  }

  function patchScheduler() {
    const scheduler = app();
    if (!scheduler || scheduler.__assessmentWeeklyV7) return;

    const originalAutoMap = scheduler.autoMapTypeToCategory?.bind(scheduler);
    if (originalAutoMap) {
      scheduler.autoMapTypeToCategory = function (type, courseId) {
        if (String(type).toLowerCase() === 'test') {
          const course = this.courses.find((c) => Number(c.id) === Number(courseId));
          const names = ['Tests', 'Test', 'Exams', 'Exam'];
          for (const name of names) {
            const found = course?.gradeCategories?.find(
              (cat) => String(cat.name).toLowerCase() === name.toLowerCase(),
            );
            if (found) return found.name;
          }
          return null;
        }
        return originalAutoMap(type, courseId);
      };
    }

    const originalAddTask = scheduler.addTask.bind(scheduler);
    scheduler.addTask = function (...args) {
      const draft = scheduleDraft();
      if (!validateAssessment(draft)) return;
      const before = new Set(this.tasks.map((task) => Number(task.id)));
      const result = originalAddTask(...args);
      const created = this.tasks.find((task) => !before.has(Number(task.id)));
      if (created) {
        applyAssessmentMetadata(created, draft);
        this.saveTasks();
        this.renderTasks();
        this.renderCalendar?.();
        this.renderTodayAssignments?.();
      }
      return result;
    };

    const originalUpdateTask = scheduler.updateTask.bind(scheduler);
    scheduler.updateTask = function (...args) {
      const id = this.editingTaskId;
      const draft = scheduleDraft();
      if (!validateAssessment(draft)) return;
      const result = originalUpdateTask(...args);
      const updated = this.tasks.find((task) => Number(task.id) === Number(id));
      if (updated) {
        applyAssessmentMetadata(updated, draft);
        this.saveTasks();
        this.renderTasks();
        this.renderCalendar?.();
        this.renderTodayAssignments?.();
      }
      return result;
    };

    const originalEditTask = scheduler.editTask.bind(scheduler);
    scheduler.editTask = function (taskId, ...args) {
      const task = this.tasks.find((item) => Number(item.id) === Number(taskId));
      const result = originalEditTask(taskId, ...args);
      refreshAssessmentUI(task);
      return result;
    };

    const originalClearTaskForm = scheduler.clearTaskForm?.bind(scheduler);
    if (originalClearTaskForm) {
      scheduler.clearTaskForm = function (...args) {
        const result = originalClearTaskForm(...args);
        clearAssessmentFields();
        return result;
      };
    }

    const originalRenderTasks = scheduler.renderTasks.bind(scheduler);
    scheduler.renderTasks = function (...args) {
      const result = originalRenderTasks(...args);
      renderWeeklyTracker();
      return result;
    };

    const originalCreateTaskHTML = scheduler.createTaskHTML.bind(scheduler);
    scheduler.createTaskHTML = function (task, ...args) {
      const html = originalCreateTaskHTML(task, ...args);
      if (!isAssessmentType(task.type)) return html;
      const schedule = assessmentScheduleText(task);
      if (!schedule) return html;
      const meta = TYPE_META[String(task.type || '').toLowerCase()] || TYPE_META.exam;
      const block = `<div class="v7-assessment-inline"><strong>${meta.icon} ${meta.label}</strong><span>${escapeHtml(schedule)}</span></div>`;
      return html.replace('<div class="task-meta">', `${block}<div class="task-meta">`);
    };

    scheduler.__assessmentWeeklyV7 = true;
  }

  function init() {
    injectStyles();
    ensureTestOption();
    injectAssessmentPanel();
    patchScheduler();

    const typeSelect = document.getElementById('assignmentType');
    if (typeSelect && !typeSelect.dataset.v7AssessmentBound) {
      typeSelect.addEventListener('change', () => refreshAssessmentUI());
      typeSelect.dataset.v7AssessmentBound = 'true';
    }
    refreshAssessmentUI();
    app().renderTasks?.();
  }

  window.SchedulerFeatures.register('assessments', init);
})();
