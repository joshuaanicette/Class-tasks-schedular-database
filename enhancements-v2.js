// Class Task Scheduler Pro: Drexel calendar alignment, weekly time tracking, and reminder upgrade.
(function () {
    'use strict';

    const DAY_MS = 86400000;
    const HOUR_MS = 3600000;
    const DEFAULT_TERM = 'Fall Quarter 2026';

    // Official Drexel University academic-calendar dates currently published for the
    // quarter-to-semester transition. "end" is the final examination date so the
    // planner includes the complete academic term, not only the final class date.
    const TERM_CALENDAR = {
        'Summer Quarter 2026': {
            system: 'Quarter', start: '2026-06-22', classesEnd: '2026-08-29', end: '2026-09-05',
            months: 'June–September 2026', shortRange: 'Jun 22 – Sep 5', transition: false
        },
        'Fall Quarter 2026': {
            system: 'Quarter', start: '2026-09-22', classesEnd: '2026-12-05', end: '2026-12-12',
            months: 'September–December 2026', shortRange: 'Sep 22 – Dec 12', transition: false
        },
        'Winter Quarter 2027': {
            system: 'Quarter', start: '2027-01-04', classesEnd: '2027-03-13', end: '2027-03-20',
            months: 'January–March 2027', shortRange: 'Jan 4 – Mar 20', transition: false
        },
        'Spring Quarter 2027': {
            system: 'Quarter', start: '2027-03-29', classesEnd: '2027-06-05', end: '2027-06-12',
            months: 'March–June 2027', shortRange: 'Mar 29 – Jun 12', transition: false
        },
        'Summer Transition Quarter 2027': {
            system: 'Transition Quarter', start: '2027-06-21', classesEnd: '2027-08-07', end: '2027-08-14',
            months: 'June–August 2027', shortRange: 'Jun 21 – Aug 14', transition: true
        },
        'Fall Semester 2027': {
            system: 'Semester', start: '2027-08-23', classesEnd: '2027-12-08', end: '2027-12-17',
            months: 'August–December 2027', shortRange: 'Aug 23 – Dec 17', transition: false
        },
        'Spring Semester 2028': {
            system: 'Semester', start: '2028-01-10', classesEnd: '2028-04-24', end: '2028-05-03',
            months: 'January–May 2028', shortRange: 'Jan 10 – May 3', transition: false
        },
        'Summer Semester 2028': {
            system: 'Semester', start: '2028-05-15', classesEnd: '2028-08-05', end: '2028-08-11',
            months: 'May–August 2028', shortRange: 'May 15 – Aug 11', transition: false
        }
    };

    const TERM_ALIASES = {
        'Summer 2026': 'Summer Quarter 2026',
        'Fall 2026': 'Fall Quarter 2026',
        'Winter 2027': 'Winter Quarter 2027',
        'Spring 2027': 'Spring Quarter 2027',
        'Summer 2027': 'Summer Transition Quarter 2027',
        'Fall 2027': 'Fall Semester 2027',
        'Winter 2028': 'Spring Semester 2028',
        'Spring 2028': 'Spring Semester 2028',
        'Summer 2028': 'Summer Semester 2028'
    };

    function scheduler() {
        try {
            return typeof taskScheduler !== 'undefined' ? taskScheduler : null;
        } catch (_) {
            return null;
        }
    }

    function escapeHtml(value) {
        const el = document.createElement('div');
        el.textContent = value == null ? '' : String(value);
        return el.innerHTML;
    }

    function parseLocalDate(dateString) {
        const [year, month, day] = String(dateString).split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
    }

    function localDateKey(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatShortDate(date) {
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function canonicalTerm(value) {
        return TERM_CALENDAR[value] ? value : (TERM_ALIASES[value] || value);
    }

    function currentOrNextTerm(referenceDate = new Date()) {
        const now = new Date(referenceDate);
        const ordered = Object.entries(TERM_CALENDAR).sort((a, b) => parseLocalDate(a[1].start) - parseLocalDate(b[1].start));
        const active = ordered.find(([, term]) => now >= parseLocalDate(term.start) && now <= parseLocalDate(term.end));
        if (active) return active[0];
        const next = ordered.find(([, term]) => now < parseLocalDate(term.start));
        return next ? next[0] : ordered[ordered.length - 1][0];
    }

    function termOptionHtml(name) {
        const term = TERM_CALENDAR[name];
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)} — ${escapeHtml(term.shortRange)}</option>`;
    }

    function updateTermHint(selectedName) {
        const select = document.getElementById('semester');
        if (!select) return;
        const name = canonicalTerm(selectedName || select.value);
        const term = TERM_CALENDAR[name];
        let hint = select.parentElement.querySelector('.semester-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'semester-hint';
            select.parentElement.appendChild(hint);
        }
        if (!term) {
            hint.textContent = 'Drexel academic-calendar date information is not available for this term.';
            return;
        }
        hint.innerHTML = `<strong>${escapeHtml(term.months)}</strong> · Classes ${formatShortDate(parseLocalDate(term.start))}–${formatShortDate(parseLocalDate(term.classesEnd))} · Exams through ${formatShortDate(parseLocalDate(term.end))}${term.transition ? ' · 7-week transition term' : ''}`;
    }

    function jumpCalendarToTerm(name) {
        const app = scheduler();
        const term = TERM_CALENDAR[canonicalTerm(name)];
        if (!app || !term) return;
        app.currentMonth = parseLocalDate(term.start);
        if (typeof app.renderCalendar === 'function') app.renderCalendar();
    }

    function applySemesterOptions(forceDefault) {
        const select = document.getElementById('semester');
        if (!select) return;
        const previous = canonicalTerm(select.value);
        const names = Object.keys(TERM_CALENDAR);
        select.innerHTML = names.map(termOptionHtml).join('');
        select.value = !forceDefault && names.includes(previous) ? previous : DEFAULT_TERM;
        updateTermHint(select.value);

        if (!select.dataset.drexelCalendarBound) {
            select.dataset.drexelCalendarBound = 'true';
            select.addEventListener('change', () => {
                updateTermHint(select.value);
                jumpCalendarToTerm(select.value);
            });
        }
    }

    function addAcademicHeader() {
        const header = document.querySelector('.header');
        if (!header) return;
        let pill = header.querySelector('.academic-horizon-pill');
        if (!pill) {
            pill = document.createElement('div');
            pill.className = 'academic-horizon-pill';
            const subtitle = header.querySelector('p');
            (subtitle || header).insertAdjacentElement(subtitle ? 'afterend' : 'beforeend', pill);
        }
        const name = currentOrNextTerm();
        const term = TERM_CALENDAR[name];
        const status = new Date() < parseLocalDate(term.start) ? 'Next' : 'Current';
        pill.innerHTML = `<span>🐉 Drexel academic calendar</span><span class="current-semester">${status}: ${escapeHtml(name)} · ${escapeHtml(term.shortRange)}</span>`;
    }

    function patchSemesterBehavior() {
        const app = scheduler();
        if (!app || app.__drexelCalendarV3) return;

        const originalClear = app.clearCourseForm.bind(app);
        app.clearCourseForm = function () {
            originalClear();
            applySemesterOptions(true);
        };

        const originalEdit = app.editCourse.bind(app);
        app.editCourse = function (courseId) {
            const course = this.courses.find(c => c.id === courseId);
            if (course && course.semester) course.semester = canonicalTerm(course.semester);
            applySemesterOptions(false);
            const result = originalEdit(courseId);
            const select = document.getElementById('semester');
            if (course && TERM_CALENDAR[course.semester] && select) select.value = course.semester;
            updateTermHint(select?.value);
            return result;
        };

        app.archiveCurrentSemester = function () {
            if (this.courses.length === 0) {
                this.showNotification('No courses to archive', 'info');
                return;
            }
            const selected = document.getElementById('semester')?.value || DEFAULT_TERM;
            const semesterName = prompt('Term name:', selected);
            if (!semesterName) return;
            const archive = {
                id: Date.now(),
                name: typeof sanitizeInput === 'function' ? sanitizeInput(semesterName) : semesterName,
                courses: [...this.courses],
                tasks: [...this.tasks],
                archivedAt: new Date(),
                gpa: this.calculateOverallGPA()
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
            this.updateStats();
            this.updateCourseSelect();
            this.renderProgress();
            this.renderCalendar();
            this.renderUpcomingReminders();
            applySemesterOptions(true);
            this.showNotification(`${semesterName} archived!`, 'success');
        };

        app.__drexelCalendarV3 = true;
    }

    // -----------------------------
    // Weekly estimated vs actual time
    // -----------------------------
    let selectedWeekStart = startOfWeek(new Date());

    function startOfWeek(value) {
        const d = new Date(value);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d;
    }

    function endOfWeek(value) {
        const d = startOfWeek(value);
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    function loadTimeEntries() {
        try {
            const data = JSON.parse(localStorage.getItem('schedulerActualTimeEntries') || '[]');
            return Array.isArray(data) ? data : [];
        } catch (_) {
            return [];
        }
    }

    function saveTimeEntries(entries) {
        localStorage.setItem('schedulerActualTimeEntries', JSON.stringify(entries));
    }

    function entriesForWeek(weekStart) {
        const start = startOfWeek(weekStart);
        const end = endOfWeek(weekStart);
        return loadTimeEntries().filter(entry => {
            const d = parseLocalDate(entry.date);
            return d >= start && d <= end;
        });
    }

    function plannedTasksForWeek(weekStart) {
        const app = scheduler();
        if (!app) return [];
        const start = startOfWeek(weekStart);
        const end = endOfWeek(weekStart);
        return app.tasks.filter(task => {
            const due = new Date(task.dueDate);
            return due >= start && due <= end && Number(task.estimatedTime || 0) > 0;
        });
    }

    function sumHours(items, getter) {
        return items.reduce((sum, item) => sum + Number(getter(item) || 0), 0);
    }

    function weeklyMetrics(weekStart) {
        const entries = entriesForWeek(weekStart);
        const tasks = plannedTasksForWeek(weekStart);
        const planned = sumHours(tasks, task => task.estimatedTime);
        const actual = sumHours(entries, entry => entry.hours);
        return { entries, tasks, planned, actual, variance: actual - planned };
    }

    function timeTaskOptions() {
        const app = scheduler();
        if (!app) return '<option value="">No assignments available</option>';
        const sorted = [...app.tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        return '<option value="">Select assignment...</option>' + sorted.map(task => `<option value="${Number(task.id)}">${escapeHtml(task.courseName || 'Course')} — ${escapeHtml(task.title)}</option>`).join('');
    }

    function courseNameForTask(taskId) {
        const app = scheduler();
        const task = app?.tasks.find(t => Number(t.id) === Number(taskId));
        return task?.courseName || 'Unassigned';
    }

    function taskName(taskId) {
        const app = scheduler();
        return app?.tasks.find(t => Number(t.id) === Number(taskId))?.title || 'Deleted assignment';
    }

    function renderWeeklyTimeTracking() {
        const container = document.getElementById('estimatedVsActual');
        if (!container) return;
        const metrics = weeklyMetrics(selectedWeekStart);
        const start = startOfWeek(selectedWeekStart);
        const end = endOfWeek(selectedWeekStart);
        const percent = metrics.planned > 0 ? (metrics.actual / metrics.planned) * 100 : 0;
        const varianceLabel = `${metrics.variance >= 0 ? '+' : ''}${metrics.variance.toFixed(1)}h`;

        container.innerHTML = `
            <div class="weekly-time-tracker">
                <div class="weekly-time-header">
                    <div>
                        <h3>Estimated vs Actual — Weekly Hours</h3>
                        <p>Estimated hours are assigned to the week an assignment is due. Actual hours come from your work logs.</p>
                    </div>
                    <div class="week-nav">
                        <button type="button" id="previousTimeWeek">←</button>
                        <button type="button" id="currentTimeWeek">This week</button>
                        <button type="button" id="nextTimeWeek">→</button>
                    </div>
                </div>
                <div class="week-range-label">${formatShortDate(start)} – ${formatShortDate(end)}, ${end.getFullYear()}</div>

                <div class="weekly-time-summary">
                    <div class="time-summary-card"><span>Estimated / planned</span><strong>${metrics.planned.toFixed(1)}h</strong></div>
                    <div class="time-summary-card"><span>Actual logged</span><strong>${metrics.actual.toFixed(1)}h</strong></div>
                    <div class="time-summary-card"><span>Variance</span><strong class="${metrics.variance > 0 ? 'time-over' : metrics.variance < 0 ? 'time-under' : ''}">${varianceLabel}</strong></div>
                    <div class="time-summary-card"><span>Actual ÷ estimate</span><strong>${metrics.planned > 0 ? percent.toFixed(0) + '%' : '—'}</strong></div>
                </div>

                <div class="time-log-panel">
                    <h4>Log actual study/work time</h4>
                    <div class="time-log-grid">
                        <div><label>Assignment</label><select id="actualTimeTask">${timeTaskOptions()}</select></div>
                        <div><label>Date</label><input type="date" id="actualTimeDate" value="${localDateKey(new Date())}"></div>
                        <div><label>Hours</label><input type="number" id="actualTimeHours" min="0.1" max="24" step="0.25" placeholder="1.5"></div>
                        <div class="time-note-field"><label>Note (optional)</label><input type="text" id="actualTimeNote" maxlength="120" placeholder="Problem set, lab report, exam review..."></div>
                        <button type="button" class="reminder-action-btn primary" id="addActualTimeEntry">+ Log time</button>
                    </div>
                </div>

                ${renderWeeklyTaskComparison(metrics)}
                ${renderWeekHistory()}
            </div>`;

        document.getElementById('previousTimeWeek')?.addEventListener('click', () => { selectedWeekStart.setDate(selectedWeekStart.getDate() - 7); renderWeeklyTimeTracking(); });
        document.getElementById('nextTimeWeek')?.addEventListener('click', () => { selectedWeekStart.setDate(selectedWeekStart.getDate() + 7); renderWeeklyTimeTracking(); });
        document.getElementById('currentTimeWeek')?.addEventListener('click', () => { selectedWeekStart = startOfWeek(new Date()); renderWeeklyTimeTracking(); });
        document.getElementById('addActualTimeEntry')?.addEventListener('click', addActualTimeEntry);
    }

    function renderWeeklyTaskComparison(metrics) {
        const app = scheduler();
        if (!app) return '';
        const ids = new Set([
            ...metrics.tasks.map(task => Number(task.id)),
            ...metrics.entries.map(entry => Number(entry.taskId)).filter(Boolean)
        ]);
        if (!ids.size) return '<div class="time-empty">No estimated or logged hours for this week yet.</div>';

        const rows = [...ids].map(id => {
            const task = app.tasks.find(t => Number(t.id) === id);
            const estimated = metrics.tasks.some(t => Number(t.id) === id) ? Number(task?.estimatedTime || 0) : 0;
            const actual = sumHours(metrics.entries.filter(e => Number(e.taskId) === id), e => e.hours);
            const variance = actual - estimated;
            return `<tr><td><strong>${escapeHtml(task?.title || 'Deleted assignment')}</strong><small>${escapeHtml(task?.courseName || 'Unassigned')}</small></td><td>${estimated.toFixed(1)}h</td><td>${actual.toFixed(1)}h</td><td class="${variance > 0 ? 'time-over' : variance < 0 ? 'time-under' : ''}">${variance >= 0 ? '+' : ''}${variance.toFixed(1)}h</td></tr>`;
        }).join('');

        const entryRows = metrics.entries.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map(entry => `<div class="time-entry-row"><div><strong>${escapeHtml(taskName(entry.taskId))}</strong><small>${escapeHtml(courseNameForTask(entry.taskId))} · ${escapeHtml(entry.date)}${entry.note ? ' · ' + escapeHtml(entry.note) : ''}</small></div><span>${Number(entry.hours).toFixed(2).replace(/\.00$/, '')}h</span><button type="button" onclick="window.deleteSchedulerTimeEntry('${escapeHtml(String(entry.id))}')">Delete</button></div>`).join('');

        return `<div class="time-comparison-section"><h4>Assignment comparison</h4><div class="time-table-wrap"><table class="time-comparison-table"><thead><tr><th>Assignment</th><th>Estimated</th><th>Actual</th><th>Variance</th></tr></thead><tbody>${rows}</tbody></table></div>${entryRows ? `<h4 class="time-log-heading">Actual-time entries</h4><div class="time-entry-list">${entryRows}</div>` : ''}</div>`;
    }

    function renderWeekHistory() {
        const weeks = [];
        const base = startOfWeek(selectedWeekStart);
        for (let offset = -4; offset <= 3; offset++) {
            const week = new Date(base);
            week.setDate(week.getDate() + offset * 7);
            const metrics = weeklyMetrics(week);
            weeks.push({ week, ...metrics });
        }
        const rows = weeks.map(item => {
            const end = endOfWeek(item.week);
            const variance = item.variance;
            return `<tr><td>${formatShortDate(item.week)}–${formatShortDate(end)}</td><td>${item.planned.toFixed(1)}h</td><td>${item.actual.toFixed(1)}h</td><td class="${variance > 0 ? 'time-over' : variance < 0 ? 'time-under' : ''}">${variance >= 0 ? '+' : ''}${variance.toFixed(1)}h</td></tr>`;
        }).join('');
        return `<div class="time-history-section"><h4>Week-by-week history</h4><div class="time-table-wrap"><table class="time-comparison-table"><thead><tr><th>Week</th><th>Estimated</th><th>Actual</th><th>Variance</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }

    function addActualTimeEntry() {
        const taskId = Number(document.getElementById('actualTimeTask')?.value || 0);
        const date = document.getElementById('actualTimeDate')?.value;
        const hours = Number(document.getElementById('actualTimeHours')?.value || 0);
        const note = document.getElementById('actualTimeNote')?.value?.trim() || '';
        const app = scheduler();
        if (!taskId || !date || !hours || hours <= 0) {
            app?.showNotification('Choose an assignment, date, and number of hours.', 'error');
            return;
        }
        const entries = loadTimeEntries();
        entries.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            taskId,
            courseId: app?.tasks.find(t => Number(t.id) === taskId)?.courseId || null,
            date,
            hours: Math.round(hours * 100) / 100,
            note,
            createdAt: new Date().toISOString()
        });
        saveTimeEntries(entries);
        selectedWeekStart = startOfWeek(parseLocalDate(date));
        renderTimeStatisticsV3();
        app?.showNotification(`${hours}h logged!`, 'success');
    }

    window.deleteSchedulerTimeEntry = function (entryId) {
        saveTimeEntries(loadTimeEntries().filter(entry => String(entry.id) !== String(entryId)));
        renderTimeStatisticsV3();
        scheduler()?.showNotification('Time entry deleted.', 'info');
    };

    function actualHoursBetween(start, end) {
        return sumHours(loadTimeEntries().filter(entry => {
            const d = parseLocalDate(entry.date);
            return d >= start && d <= end;
        }), entry => entry.hours);
    }

    function renderTimeStatisticsV3() {
        const now = new Date();
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const currentName = currentOrNextTerm(now);
        const term = TERM_CALENDAR[currentName];
        const termStart = parseLocalDate(term.start);
        const termEnd = parseLocalDate(term.end);
        const weekHours = actualHoursBetween(weekStart, weekEnd);
        const monthHours = actualHoursBetween(monthStart, monthEnd);
        const termHours = actualHoursBetween(termStart, termEnd);

        const weekEl = document.getElementById('totalTimeWeek');
        const monthEl = document.getElementById('totalTimeMonth');
        const semesterEl = document.getElementById('totalTimeSemester');
        const avgEl = document.getElementById('averageTimeDay');
        if (weekEl) weekEl.textContent = weekHours.toFixed(1) + 'h';
        if (monthEl) monthEl.textContent = monthHours.toFixed(1) + 'h';
        if (semesterEl) semesterEl.textContent = termHours.toFixed(1) + 'h';
        if (avgEl) avgEl.textContent = (weekHours / 7).toFixed(1) + 'h';

        renderActualTimeByCourse();
        renderWeeklyTimeTracking();
    }

    function renderActualTimeByCourse() {
        const container = document.getElementById('timeBreakdownByCourse');
        const app = scheduler();
        if (!container || !app) return;
        const entries = loadTimeEntries();
        const totals = new Map();
        entries.forEach(entry => totals.set(Number(entry.courseId), (totals.get(Number(entry.courseId)) || 0) + Number(entry.hours || 0)));
        const total = [...totals.values()].reduce((a, b) => a + b, 0);
        if (!total) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px">No actual time logged yet. Use the weekly tracker below to start measuring your workload.</p>';
            return;
        }
        container.innerHTML = app.courses.map(course => {
            const hours = totals.get(Number(course.id)) || 0;
            if (!hours) return '';
            const pct = total ? (hours / total) * 100 : 0;
            return `<div style="margin:15px 0"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><strong>${escapeHtml(course.name)}</strong><span>${hours.toFixed(1)}h (${pct.toFixed(0)}%)</span></div><div style="background:var(--border-color);height:20px;border-radius:10px;overflow:hidden"><div style="background:${app.getCourseColor(course.id)};height:100%;width:${pct}%"></div></div></div>`;
        }).join('');
    }

    function patchTimeTrackingBehavior() {
        const app = scheduler();
        if (!app || app.__weeklyTimeTrackingV3) return;
        app.renderTimeStatistics = renderTimeStatisticsV3;
        app.renderTimeBreakdownByCourse = renderActualTimeByCourse;
        ['addTask', 'updateTask', 'completeTask', 'deleteTask'].forEach(method => {
            if (typeof app[method] !== 'function') return;
            const original = app[method].bind(app);
            app[method] = function (...args) {
                const result = original(...args);
                setTimeout(renderTimeStatisticsV3, 0);
                return result;
            };
        });
        app.__weeklyTimeTrackingV3 = true;
    }

    // -----------------------------
    // Smart reminders
    // -----------------------------
    function reminderSettings() {
        const defaults = {
            reminders7days: true,
            reminders3days: true,
            reminders1day: true,
            remindersDueToday: true,
            remindersOverdue: true,
            remindersHighPriority: true,
            browserNotifications: false,
            lookaheadDays: 14
        };
        try {
            const legacy = JSON.parse(localStorage.getItem('reminderSettings') || '{}');
            const current = JSON.parse(localStorage.getItem('reminderSettingsV2') || '{}');
            return { ...defaults, ...(legacy || {}), ...(current || {}) };
        } catch (_) {
            return defaults;
        }
    }

    function saveReminderSettings(next) {
        localStorage.setItem('reminderSettingsV2', JSON.stringify(next));
        localStorage.setItem('reminderSettings', JSON.stringify({
            reminders7days: next.reminders7days,
            reminders3days: next.reminders3days,
            reminders1day: next.reminders1day,
            remindersHighPriority: next.remindersHighPriority
        }));
    }

    function isSnoozed(taskId) {
        try {
            const snoozes = JSON.parse(localStorage.getItem('schedulerReminderSnoozes') || '{}');
            const until = Number(snoozes[taskId] || 0);
            if (until > Date.now()) return true;
            if (until) {
                delete snoozes[taskId];
                localStorage.setItem('schedulerReminderSnoozes', JSON.stringify(snoozes));
            }
        } catch (_) {}
        return false;
    }

    function reminderFor(task, now, config) {
        if (task.completed || isSnoozed(task.id)) return null;
        const dueDate = new Date(task.dueDate);
        if (Number.isNaN(dueDate.getTime())) return null;
        const diff = dueDate - now;
        const days = Math.ceil(diff / DAY_MS);
        const hours = Math.ceil(diff / HOUR_MS);
        let type = null;
        let severity = 'passive';
        let label = '';
        let score = 999;

        if (diff < 0 && config.remindersOverdue) {
            const overdueDays = Math.max(1, Math.ceil(Math.abs(diff) / DAY_MS));
            type = 'overdue'; severity = 'danger'; score = 0;
            label = `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
        } else if (days === 0 && config.remindersDueToday) {
            type = 'today'; severity = 'danger'; score = 10;
            label = hours <= 1 ? 'Due within the hour' : `Due today · ~${hours}h`;
        } else if (days === 1 && config.reminders1day) {
            type = '1day'; severity = 'warning'; score = 20; label = 'Due tomorrow';
        } else if (days > 1 && days <= 3 && config.reminders3days) {
            type = '3days'; severity = 'warning'; score = 30 + days; label = `Due in ${days} days`;
        } else if (days > 3 && days <= 7 && config.reminders7days) {
            type = '7days'; severity = 'info'; score = 50 + days; label = `Due in ${days} days`;
        } else if (task.priority === 'high' && config.remindersHighPriority && days > 0 && days <= config.lookaheadDays) {
            type = 'high'; severity = days <= 5 ? 'warning' : 'info'; score = 70 + days;
            label = `High priority · due in ${days} days`;
        } else if (days > 0 && days <= config.lookaheadDays) {
            type = 'upcoming'; severity = 'passive'; score = 100 + days; label = `Upcoming · ${days} days`;
        }
        return type ? { task, dueDate, days, type, severity, label, score } : null;
    }

    function getReminders() {
        const app = scheduler();
        if (!app) return [];
        const now = new Date();
        const config = reminderSettings();
        return app.tasks.map(task => reminderFor(task, now, config)).filter(Boolean).sort((a, b) => a.score - b.score || a.dueDate - b.dueDate);
    }

    function reminderToggle(id, title, description, checked) {
        return `<label class="reminder-toggle"><input type="checkbox" id="${id}"${checked ? ' checked' : ''}><span><strong>${title}</strong><small>${description}</small></span></label>`;
    }

    function notificationStatus() {
        if (!('Notification' in window)) return 'Browser alerts are not supported here. In-app reminders still work.';
        if (Notification.permission === 'granted') return '✅ Browser alerts are enabled while the scheduler is open.';
        if (Notification.permission === 'denied') return 'Browser alerts are blocked. You can re-enable them in the browser site settings.';
        return 'Browser alerts are optional and work while the scheduler is open.';
    }

    function renderReminderSettingsPanel() {
        const panel = document.querySelector('.reminder-settings');
        if (!panel || panel.dataset.upgraded === 'true') return;
        const config = reminderSettings();
        panel.dataset.upgraded = 'true';
        panel.className = 'reminder-settings reminder-settings-v2';
        panel.innerHTML = `<div><h3 style="margin-bottom:5px">Reminder Settings</h3><p style="color:var(--text-secondary);font-size:.88rem">Control how early assignments become visible in your reminder queue.</p></div><div class="reminder-settings-grid">${reminderToggle('reminders7days','7-day heads-up','Early warning for exams, projects, and larger assignments',config.reminders7days)}${reminderToggle('reminders3days','3-day reminder','A useful checkpoint before work becomes urgent',config.reminders3days)}${reminderToggle('reminders1day','1-day reminder','Highlight work due tomorrow',config.reminders1day)}${reminderToggle('remindersDueToday','Due today','Keep same-day deadlines at the top',config.remindersDueToday)}${reminderToggle('remindersOverdue','Overdue alerts','Continue surfacing unfinished work after its deadline',config.remindersOverdue)}${reminderToggle('remindersHighPriority','High-priority boost','Surface high-priority assignments earlier',config.remindersHighPriority)}</div><div class="reminder-controls-row"><div class="reminder-lookahead"><label for="reminderLookaheadDays" style="display:block;margin-bottom:5px;font-weight:650">Upcoming window</label><select id="reminderLookaheadDays">${[7,14,21,30].map(n => `<option value="${n}"${Number(config.lookaheadDays) === n ? ' selected' : ''}>${n} days</option>`).join('')}</select></div><button type="button" class="reminder-action-btn primary" id="saveReminderSettingsV2">Save reminder settings</button><button type="button" class="reminder-action-btn" id="enableBrowserRemindersV2">Enable browser alerts</button></div><div class="reminder-browser-status" id="reminderBrowserStatus">${notificationStatus()}</div>`;
        document.getElementById('saveReminderSettingsV2')?.addEventListener('click', saveReminderPanel);
        document.getElementById('enableBrowserRemindersV2')?.addEventListener('click', requestBrowserAlerts);
    }

    function saveReminderPanel() {
        const next = reminderSettings();
        ['reminders7days','reminders3days','reminders1day','remindersDueToday','remindersOverdue','remindersHighPriority'].forEach(id => {
            const el = document.getElementById(id);
            if (el) next[id] = el.checked;
        });
        const lookahead = document.getElementById('reminderLookaheadDays');
        if (lookahead) next.lookaheadDays = Number(lookahead.value) || 14;
        next.browserNotifications = 'Notification' in window && Notification.permission === 'granted';
        saveReminderSettings(next);
        renderReminders();
        scheduler()?.showNotification('Reminder settings saved!', 'success');
    }

    async function requestBrowserAlerts() {
        const status = document.getElementById('reminderBrowserStatus');
        if (!('Notification' in window)) {
            if (status) status.textContent = notificationStatus();
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            const next = reminderSettings();
            next.browserNotifications = permission === 'granted';
            saveReminderSettings(next);
            if (status) status.textContent = notificationStatus();
            if (permission === 'granted') sendBrowserDigest(true);
        } catch (_) {
            if (status) status.textContent = 'Could not enable browser alerts. In-app reminders remain available.';
        }
    }

    function reminderCard(item) {
        const task = item.task;
        const course = task.courseName || 'Unassigned course';
        const priority = task.priority ? `${task.priority} priority` : 'normal priority';
        const due = item.dueDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        return `<div class="smart-reminder-card severity-${item.severity}"><div><h4 class="smart-reminder-title">${escapeHtml(task.title)}</h4><div class="smart-reminder-meta">${escapeHtml(course)} · ${escapeHtml(due)}</div><span class="smart-reminder-badge">${escapeHtml(item.label)} · ${escapeHtml(priority)}</span></div><div class="smart-reminder-actions"><div class="smart-reminder-due">${escapeHtml(item.label)}</div><button class="smart-reminder-mini-btn" onclick="window.focusSchedulerAssignment(${Number(task.id)})">Open task</button><button class="smart-reminder-mini-btn" onclick="window.snoozeSchedulerReminder(${Number(task.id)})">Snooze 1 day</button></div></div>`;
    }

    function renderReminders() {
        const container = document.getElementById('upcomingRemindersList');
        if (!container) return;
        const reminders = getReminders();
        const overdue = reminders.filter(x => x.type === 'overdue').length;
        const dueSoon = reminders.filter(x => ['today','1day','3days'].includes(x.type)).length;
        const summary = `<div class="reminder-summary-grid"><div class="reminder-summary-card"><span>Urgent / due soon</span><strong>${dueSoon}</strong></div><div class="reminder-summary-card"><span>Overdue</span><strong>${overdue}</strong></div><div class="reminder-summary-card"><span>In upcoming window</span><strong>${reminders.length}</strong></div></div>`;
        container.innerHTML = reminders.length ? summary + `<div class="smart-reminder-list">${reminders.slice(0, 12).map(reminderCard).join('')}</div>` : summary + '<div class="smart-reminder-empty">🎉 Nothing pressing right now. Your upcoming assignment window is clear.</div>';
        sendBrowserDigest(false);
    }

    function sendBrowserDigest(force) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const config = reminderSettings();
        if (!force && !config.browserNotifications) return;
        const reminders = getReminders().filter(x => x.severity !== 'passive');
        if (!reminders.length) return;
        const key = reminders.slice(0, 5).map(x => `${x.task.id}:${x.type}:${x.days}`).join('|');
        const day = new Date().toISOString().slice(0, 10);
        if (!force && localStorage.getItem('schedulerReminderDigestKey') === `${day}:${key}`) return;
        const first = reminders[0];
        const body = reminders.length === 1 ? `${first.task.title} — ${first.label}` : `${first.task.title} — ${first.label}. Plus ${reminders.length - 1} more reminder${reminders.length === 2 ? '' : 's'}.`;
        try {
            new Notification('Class Task Scheduler', { body, tag: 'class-task-reminder-digest' });
            localStorage.setItem('schedulerReminderDigestKey', `${day}:${key}`);
        } catch (_) {}
    }

    function patchReminderBehavior() {
        const app = scheduler();
        if (!app || app.__remindersV3) return;
        app.checkUpcomingReminders = getReminders;
        app.renderUpcomingReminders = renderReminders;
        app.loadReminderSettings = reminderSettings;
        app.saveReminderSettings = saveReminderPanel;
        app.__remindersV3 = true;
    }

    window.focusSchedulerAssignment = function (id) {
        const app = scheduler();
        if (!app) return;
        const tab = [...document.querySelectorAll('.tab')].find(el => el.textContent.includes('Assignments'));
        if (tab) tab.click();
        setTimeout(() => app.editTask(Number(id)), 50);
    };

    window.snoozeSchedulerReminder = function (id) {
        let snoozes = {};
        try { snoozes = JSON.parse(localStorage.getItem('schedulerReminderSnoozes') || '{}'); } catch (_) {}
        snoozes[id] = Date.now() + DAY_MS;
        localStorage.setItem('schedulerReminderSnoozes', JSON.stringify(snoozes));
        scheduler()?.showNotification('Reminder snoozed until tomorrow.', 'info');
        renderReminders();
    };

    window.requestNotificationPermission = requestBrowserAlerts;

    function loadTrackingStyles() {
        if (document.querySelector('link[data-drexel-time-tracking]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'drexel-time-tracking.css';
        link.dataset.drexelTimeTracking = 'true';
        document.head.appendChild(link);
    }

    function init() {
        loadTrackingStyles();
        addAcademicHeader();
        applySemesterOptions(true);
        patchSemesterBehavior();
        patchTimeTrackingBehavior();
        patchReminderBehavior();
        renderReminderSettingsPanel();
        renderReminders();
        renderTimeStatisticsV3();
        setInterval(() => {
            renderReminders();
            sendBrowserDigest(false);
        }, 300000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
    else setTimeout(init, 0);
})();