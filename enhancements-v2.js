// Class Task Scheduler Pro: 2026-2028 planning + reminder upgrade.
(function () {
    'use strict';

    const SEMESTERS = [
        'Winter 2026', 'Spring 2026', 'Summer 2026', 'Fall 2026',
        'Winter 2027', 'Spring 2027', 'Summer 2027', 'Fall 2027',
        'Winter 2028', 'Spring 2028', 'Summer 2028', 'Fall 2028'
    ];
    const DEFAULT_SEMESTER = 'Fall 2026';
    const DAY_MS = 86400000;

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

    function settings() {
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

    function saveSettings(next) {
        localStorage.setItem('reminderSettingsV2', JSON.stringify(next));
        localStorage.setItem('reminderSettings', JSON.stringify({
            reminders7days: next.reminders7days,
            reminders3days: next.reminders3days,
            reminders1day: next.reminders1day,
            remindersHighPriority: next.remindersHighPriority
        }));
    }

    function applySemesterOptions(forceDefault) {
        const select = document.getElementById('semester');
        if (!select) return;
        const previous = select.value;
        select.innerHTML = SEMESTERS.map(name => `<option value="${name}">${name}</option>`).join('');
        select.value = !forceDefault && SEMESTERS.includes(previous) ? previous : DEFAULT_SEMESTER;

        if (!select.parentElement.querySelector('.semester-hint')) {
            const hint = document.createElement('div');
            hint.className = 'semester-hint';
            hint.textContent = 'Academic planning window: 2026–2028';
            select.parentElement.appendChild(hint);
        }
    }

    function addAcademicHeader() {
        const header = document.querySelector('.header');
        if (!header || header.querySelector('.academic-horizon-pill')) return;
        const pill = document.createElement('div');
        pill.className = 'academic-horizon-pill';
        pill.innerHTML = '<span>📚 2026–2028 academic planner</span><span class="current-semester">Current: Fall 2026</span>';
        const subtitle = header.querySelector('p');
        (subtitle || header).insertAdjacentElement(subtitle ? 'afterend' : 'beforeend', pill);
    }

    function patchSemesterBehavior() {
        const app = scheduler();
        if (!app || app.__semesterV2) return;

        const originalClear = app.clearCourseForm.bind(app);
        app.clearCourseForm = function () {
            originalClear();
            applySemesterOptions(true);
        };

        const originalArchive = app.archiveCurrentSemester.bind(app);
        app.archiveCurrentSemester = function () {
            if (this.courses.length === 0) {
                this.showNotification('No courses to archive', 'info');
                return;
            }

            const semesterName = prompt('Semester name:', DEFAULT_SEMESTER);
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

        app.__semesterV2 = true;
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
        const hours = Math.ceil(diff / 3600000);
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
        const config = settings();
        return app.tasks
            .map(task => reminderFor(task, now, config))
            .filter(Boolean)
            .sort((a, b) => a.score - b.score || a.dueDate - b.dueDate);
    }

    function toggle(id, title, description, checked) {
        return `<label class="reminder-toggle"><input type="checkbox" id="${id}"${checked ? ' checked' : ''}><span><strong>${title}</strong><small>${description}</small></span></label>`;
    }

    function notificationStatus() {
        if (!('Notification' in window)) return 'Browser alerts are not supported here. In-app reminders still work.';
        if (Notification.permission === 'granted') return '✅ Browser alerts are enabled while the scheduler is open.';
        if (Notification.permission === 'denied') return 'Browser alerts are blocked. You can re-enable them in the browser site settings.';
        return 'Browser alerts are optional and work while the scheduler is open.';
    }

    function renderSettingsPanel() {
        const panel = document.querySelector('.reminder-settings');
        if (!panel || panel.dataset.upgraded === 'true') return;
        const config = settings();
        panel.dataset.upgraded = 'true';
        panel.className = 'reminder-settings reminder-settings-v2';
        panel.innerHTML = `
            <div><h3 style="margin-bottom:5px">Reminder Settings</h3><p style="color:var(--text-secondary);font-size:.88rem">Control how early assignments become visible in your reminder queue.</p></div>
            <div class="reminder-settings-grid">
                ${toggle('reminders7days', '7-day heads-up', 'Early warning for exams, projects, and larger assignments', config.reminders7days)}
                ${toggle('reminders3days', '3-day reminder', 'A useful checkpoint before work becomes urgent', config.reminders3days)}
                ${toggle('reminders1day', '1-day reminder', 'Highlight work due tomorrow', config.reminders1day)}
                ${toggle('remindersDueToday', 'Due today', 'Keep same-day deadlines at the top', config.remindersDueToday)}
                ${toggle('remindersOverdue', 'Overdue alerts', 'Continue surfacing unfinished work after its deadline', config.remindersOverdue)}
                ${toggle('remindersHighPriority', 'High-priority boost', 'Surface high-priority assignments earlier', config.remindersHighPriority)}
            </div>
            <div class="reminder-controls-row">
                <div class="reminder-lookahead"><label for="reminderLookaheadDays" style="display:block;margin-bottom:5px;font-weight:650">Upcoming window</label><select id="reminderLookaheadDays">${[7,14,21,30].map(n => `<option value="${n}"${Number(config.lookaheadDays) === n ? ' selected' : ''}>${n} days</option>`).join('')}</select></div>
                <button type="button" class="reminder-action-btn primary" id="saveReminderSettingsV2">Save reminder settings</button>
                <button type="button" class="reminder-action-btn" id="enableBrowserRemindersV2">Enable browser alerts</button>
            </div>
            <div class="reminder-browser-status" id="reminderBrowserStatus">${notificationStatus()}</div>`;

        document.getElementById('saveReminderSettingsV2').addEventListener('click', saveReminderPanel);
        document.getElementById('enableBrowserRemindersV2').addEventListener('click', requestBrowserAlerts);
    }

    function saveReminderPanel() {
        const next = settings();
        ['reminders7days','reminders3days','reminders1day','remindersDueToday','remindersOverdue','remindersHighPriority'].forEach(id => {
            const el = document.getElementById(id);
            if (el) next[id] = el.checked;
        });
        const lookahead = document.getElementById('reminderLookaheadDays');
        if (lookahead) next.lookaheadDays = Number(lookahead.value) || 14;
        next.browserNotifications = 'Notification' in window && Notification.permission === 'granted';
        saveSettings(next);
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
            const next = settings();
            next.browserNotifications = permission === 'granted';
            saveSettings(next);
            if (status) status.textContent = notificationStatus();
            if (permission === 'granted') sendBrowserDigest(true);
        } catch (_) {
            if (status) status.textContent = 'Could not enable browser alerts. In-app reminders remain available.';
        }
    }

    function card(item) {
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
        container.innerHTML = reminders.length
            ? summary + `<div class="smart-reminder-list">${reminders.slice(0, 12).map(card).join('')}</div>`
            : summary + '<div class="smart-reminder-empty">🎉 Nothing pressing right now. Your upcoming assignment window is clear.</div>';
        sendBrowserDigest(false);
    }

    function sendBrowserDigest(force) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const config = settings();
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
        if (!app || app.__remindersV2) return;
        app.checkUpcomingReminders = getReminders;
        app.renderUpcomingReminders = renderReminders;
        app.loadReminderSettings = settings;
        app.saveReminderSettings = saveReminderPanel;

        ['addTask','updateTask','completeTask','deleteTask'].forEach(method => {
            if (typeof app[method] !== 'function') return;
            const original = app[method].bind(app);
            app[method] = function (...args) {
                const result = original(...args);
                setTimeout(renderReminders, 0);
                return result;
            };
        });
        app.__remindersV2 = true;
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

    function init() {
        addAcademicHeader();
        applySemesterOptions(true);
        patchSemesterBehavior();
        patchReminderBehavior();
        renderSettingsPanel();
        renderReminders();
        setInterval(() => {
            renderReminders();
            sendBrowserDigest(false);
        }, 300000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
    else setTimeout(init, 0);
})();
