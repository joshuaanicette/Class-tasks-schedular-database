// Enhancements for 2026-2028 semester planning, UI polish, and smarter reminders.
(function () {
    const SEMESTERS = [
        'Winter 2026', 'Spring 2026', 'Summer 2026', 'Fall 2026',
        'Winter 2027', 'Spring 2027', 'Summer 2027', 'Fall 2027',
        'Winter 2028', 'Spring 2028', 'Summer 2028', 'Fall 2028'
    ];

    const DEFAULT_SEMESTER = 'Fall 2026';
    const DAY_MS = 24 * 60 * 60 * 1000;

    function safeText(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function getScheduler() {
        return window.taskScheduler || null;
    }

    function getReminderSettingsV2() {
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
            const legacy = JSON.parse(localStorage.getItem('reminderSettings') || '{}') || {};
            const v2 = JSON.parse(localStorage.getItem('reminderSettingsV2') || '{}') || {};
            return { ...defaults, ...legacy, ...v2 };
        } catch (error) {
            return defaults;
        }
    }

    function saveReminderSettingsV2(settings) {
        localStorage.setItem('reminderSettingsV2', JSON.stringify(settings));
        localStorage.setItem('reminderSettings', JSON.stringify({
            reminders7days: settings.reminders7days,
            reminders3days: settings.reminders3days,
            reminders1day: settings.reminders1day,
            remindersHighPriority: settings.remindersHighPriority
        }));
    }

    function applySemesterOptions() {
        const semester = document.getElementById('semester');
        if (!semester) return;

        const existing = semester.value;
        semester.innerHTML = SEMESTERS.map(name => (
            `<option value="${safeText(name)}"${name === DEFAULT_SEMESTER ? ' selected' : ''}>${safeText(name)}</option>`
        )).join('');

        if (SEMESTERS.includes(existing)) {
            semester.value = existing;
        } else {
            semester.value = DEFAULT_SEMESTER;
        }

        if (!semester.parentElement.querySelector('.semester-hint')) {
            const hint = document.createElement('div');
            hint.className = 'semester-hint';
            hint.textContent = 'Academic planning window: 2026–2028';
            semester.parentElement.appendChild(hint);
        }
    }

    function addAcademicHorizonPill() {
        const header = document.querySelector('.header');
        if (!header || header.querySelector('.academic-horizon-pill')) return;
        const pill = document.createElement('div');
        pill.className = 'academic-horizon-pill';
        pill.innerHTML = '<span>📚 2026–2028 academic planner</span><span class="current-semester">Current: Fall 2026</span>';
        const subtitle = header.querySelector('p');
        if (subtitle) subtitle.insertAdjacentElement('afterend', pill);
        else header.appendChild(pill);
    }

    function patchArchivePrompt() {
        const scheduler = getScheduler();
        if (!scheduler || scheduler.__archivePromptPatched || typeof scheduler.archiveCurrentSemester !== 'function') return;

        scheduler.archiveCurrentSemester = function () {
            if (this.courses.length === 0) {
                this.showNotification('No courses to archive', 'info');
                return;
            }

            const semesterName = prompt('Semester name:', DEFAULT_SEMESTER);
            if (!semesterName) return;

            const archive = {
                id: Date.now(),
                name: typeof sanitizeInput === 'function' ? sanitizeInput(semesterName) : semesterName,
                courses: JSON.parse(JSON.stringify(this.courses)),
                tasks: JSON.parse(JSON.stringify(this.tasks)),
                archivedAt: new Date().toISOString()
            };

            this.archives.push(archive);
            if (typeof this.saveArchives === 'function') this.saveArchives();
            if (typeof this.renderArchive === 'function') this.renderArchive();
            this.showNotification(`${semesterName} archived!`, 'success');
        };
        scheduler.__archivePromptPatched = true;
    }

    function getReminderState(task, now, settings) {
        const dueDate = new Date(task.dueDate);
        if (Number.isNaN(dueDate.getTime())) return null;

        const diffMs = dueDate - now;
        const days = Math.ceil(diffMs / DAY_MS);
        const hours = Math.ceil(diffMs / (60 * 60 * 1000));
        let type = null;
        let severity = 'passive';
        let label = '';
        let score = 1000;

        if (diffMs < 0 && settings.remindersOverdue) {
            type = 'overdue';
            severity = 'danger';
            const overdueDays = Math.max(1, Math.ceil(Math.abs(diffMs) / DAY_MS));
            label = `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
            score = 0;
        } else if (days === 0 && settings.remindersDueToday) {
            type = 'today';
            severity = 'danger';
            label = hours <= 1 ? 'Due within the hour' : `Due today${hours > 0 ? ` · ~${hours}h` : ''}`;
            score = 10;
        } else if (days === 1 && settings.reminders1day) {
            type = '1day';
            severity = 'warning';
            label = 'Due tomorrow';
            score = 20;
        } else if (days <= 3 && days > 1 && settings.reminders3days) {
            type = '3days';
            severity = 'warning';
            label = `Due in ${days} days`;
            score = 30 + days;
        } else if (days <= 7 && days > 3 && settings.reminders7days) {
            type = '7days';
            severity = 'info';
            label = `Due in ${days} days`;
            score = 50 + days;
        } else if (task.priority === 'high' && settings.remindersHighPriority && days > 0 && days <= settings.lookaheadDays) {
            type = 'highPriority';
            severity = days <= 5 ? 'warning' : 'info';
            label = `High priority · due in ${days} days`;
            score = 70 + days;
        } else if (days > 0 && days <= settings.lookaheadDays) {
            type = 'upcoming';
            severity = 'passive';
            label = `Upcoming · ${days} days`;
            score = 100 + days;
        }

        if (!type) return null;
        return { task, dueDate, days, type, severity, label, score };
    }

    function collectReminders() {
        const scheduler = getScheduler();
        if (!scheduler) return [];
        const now = new Date();
        const settings = getReminderSettingsV2();
        return scheduler.tasks
            .filter(task => !task.completed)
            .map(task => getReminderState(task, now, settings))
            .filter(Boolean)
            .sort((a, b) => a.score - b.score || a.dueDate - b.dueDate);
    }

    function renderReminderSettingsPanel() {
        const original = document.querySelector('.reminder-settings');
        if (!original || original.dataset.upgraded === 'true') return;
        const settings = getReminderSettingsV2();
        original.dataset.upgraded = 'true';
        original.className = 'reminder-settings reminder-settings-v2';
        original.innerHTML = `
            <div>
                <h3 style="margin-bottom: 5px;">Reminder Settings</h3>
                <p style="color: var(--text-secondary); font-size: .88rem;">Choose how early the scheduler should surface assignments.</p>
            </div>
            <div class="reminder-settings-grid">
                ${toggle('reminders7days', '7-day heads-up', 'Useful for exams, projects, and longer assignments', settings.reminders7days)}
                ${toggle('reminders3days', '3-day reminder', 'Good checkpoint for work that has not started yet', settings.reminders3days)}
                ${toggle('reminders1day', '1-day reminder', 'Show assignments that are due tomorrow', settings.reminders1day)}
                ${toggle('remindersDueToday', 'Due today', 'Keep same-day deadlines at the top of the list', settings.remindersDueToday)}
                ${toggle('remindersOverdue', 'Overdue alerts', 'Continue surfacing unfinished work after the due date', settings.remindersOverdue)}
                ${toggle('remindersHighPriority', 'High-priority boost', 'Surface high-priority work earlier than normal', settings.remindersHighPriority)}
            </div>
            <div class="reminder-controls-row">
                <div class="reminder-lookahead">
                    <label for="reminderLookaheadDays" style="display:block; margin-bottom:5px; font-weight:650;">Upcoming window</label>
                    <select id="reminderLookaheadDays">
                        ${[7, 14, 21, 30].map(value => `<option value="${value}"${Number(settings.lookaheadDays) === value ? ' selected' : ''}>${value} days</option>`).join('')}
                    </select>
                </div>
                <button type="button" class="reminder-action-btn primary" id="saveReminderSettingsV2">Save reminder settings</button>
                <button type="button" class="reminder-action-btn" id="enableBrowserRemindersV2">Enable browser alerts</button>
            </div>
            <div class="reminder-browser-status" id="reminderBrowserStatus">${browserStatusText()}</div>
        `;

        document.getElementById('saveReminderSettingsV2').addEventListener('click', saveReminderPanel);
        document.getElementById('enableBrowserRemindersV2').addEventListener('click', requestBrowserNotifications);
    }

    function toggle(id, title, description, checked) {
        return `<label class="reminder-toggle"><input type="checkbox" id="${id}"${checked ? ' checked' : ''}><span><strong>${title}</strong><small>${description}</small></span></label>`;
    }

    function saveReminderPanel() {
        const settings = getReminderSettingsV2();
        ['reminders7days', 'reminders3days', 'reminders1day', 'remindersDueToday', 'remindersOverdue', 'remindersHighPriority'].forEach(id => {
            const el = document.getElementById(id);
            if (el) settings[id] = el.checked;
        });
        const lookahead = document.getElementById('reminderLookaheadDays');
        if (lookahead) settings.lookaheadDays = Number(lookahead.value) || 14;
        settings.browserNotifications = typeof Notification !== 'undefined' && Notification.permission === 'granted';
        saveReminderSettingsV2(settings);
        renderSmartReminders();
        const scheduler = getScheduler();
        if (scheduler && typeof scheduler.showNotification === 'function') {
            scheduler.showNotification('Reminder settings saved!', 'success');
        }
    }

    function browserStatusText() {
        if (!('Notification' in window)) return 'Browser alerts are not supported in this browser. In-app reminders will still work.';
        if (Notification.permission === 'granted') return '✅ Browser alerts are enabled. Alerts are sent when the app is open.';
        if (Notification.permission === 'denied') return 'Browser alerts are blocked. Re-enable notifications in your browser site settings.';
        return 'Browser alerts are optional. Enable them to receive assignment alerts while the scheduler is open.';
    }

    async function requestBrowserNotifications() {
        const status = document.getElementById('reminderBrowserStatus');
        if (!('Notification' in window)) {
            if (status) status.textContent = browserStatusText();
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            const settings = getReminderSettingsV2();
            settings.browserNotifications = permission === 'granted';
            saveReminderSettingsV2(settings);
            if (status) status.textContent = browserStatusText();
            if (permission === 'granted') sendBrowserReminderDigest(true);
        } catch (error) {
            if (status) status.textContent = 'Could not enable browser alerts. In-app reminders will continue working.';
        }
    }

    function renderSmartReminders() {
        const container = document.getElementById('upcomingRemindersList');
        if (!container) return;
        const reminders = collectReminders();
        const active = reminders.filter(item => item.severity !== 'passive');
        const overdue = reminders.filter(item => item.type === 'overdue').length;
        const dueSoon = reminders.filter(item => ['today', '1day', '3days'].includes(item.type)).length;

        const summary = `
            <div class="reminder-summary-grid">
                <div class="reminder-summary-card"><span>Urgent / due soon</span><strong>${dueSoon}</strong></div>
                <div class="reminder-summary-card"><span>Overdue</span><strong>${overdue}</strong></div>
                <div class="reminder-summary-card"><span>In upcoming window</span><strong>${reminders.length}</strong></div>
            </div>`;

        if (reminders.length === 0) {
            container.innerHTML = summary + '<div class="smart-reminder-empty">🎉 Nothing pressing right now. Your upcoming assignment window is clear.</div>';
            return;
        }

        const visible = reminders.slice(0, 12);
        container.innerHTML = summary + `<div class="smart-reminder-list">${visible.map(item => reminderCard(item)).join('')}</div>`;

        if (active.length > 0) sendBrowserReminderDigest(false);
    }

    function reminderCard(item) {
        const task = item.task;
        const course = task.courseName || 'Unassigned course';
        const priority = task.priority ? `${task.priority} priority` : 'normal priority';
        const due = item.dueDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        return `
            <div class="smart-reminder-card severity-${item.severity}">
                <div>
                    <h4 class="smart-reminder-title">${safeText(task.title)}</h4>
                    <div class="smart-reminder-meta">${safeText(course)} · ${safeText(due)}</div>
                    <span class="smart-reminder-badge">${safeText(item.label)} · ${safeText(priority)}</span>
                </div>
                <div class="smart-reminder-actions">
                    <div class="smart-reminder-due">${safeText(item.label)}</div>
                    <button class="smart-reminder-mini-btn" onclick="window.focusSchedulerAssignment(${Number(task.id)})">Open task</button>
                    <button class="smart-reminder-mini-btn" onclick="window.snoozeSchedulerReminder(${Number(task.id)})">Snooze 1 day</button>
                </div>
            </div>`;
    }

    function sendBrowserReminderDigest(force) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const settings = getReminderSettingsV2();
        if (!settings.browserNotifications && !force) return;

        const reminders = collectReminders().filter(item => item.severity !== 'passive');
        if (reminders.length === 0) return;

        const key = reminders.slice(0, 5).map(item => `${item.task.id}:${item.type}:${item.days}`).join('|');
        const today = new Date().toISOString().slice(0, 10);
        const lastKey = localStorage.getItem('schedulerReminderDigestKey');
        if (!force && lastKey === `${today}:${key}`) return;

        const first = reminders[0];
        const body = reminders.length === 1
            ? `${first.task.title} — ${first.label}`
            : `${first.task.title} — ${first.label}. Plus ${reminders.length - 1} more reminder${reminders.length - 1 === 1 ? '' : 's'}.`;
        try {
            new Notification('Class Task Scheduler', { body, icon: undefined, tag: 'class-task-reminder-digest' });
            localStorage.setItem('schedulerReminderDigestKey', `${today}:${key}`);
        } catch (error) {
            // In-app reminder list remains the fallback.
        }
    }

    function overrideReminderMethods() {
        const scheduler = getScheduler();
        if (!scheduler || scheduler.__smartRemindersV2) return;
        scheduler.checkUpcomingReminders = collectReminders;
        scheduler.renderUpcomingReminders = renderSmartReminders;
        scheduler.loadReminderSettings = getReminderSettingsV2;
        scheduler.saveReminderSettings = saveReminderPanel;
        scheduler.__smartRemindersV2 = true;
    }

    window.focusSchedulerAssignment = function (id) {
        const task = getScheduler()?.tasks?.find(item => Number(item.id) === Number(id));
        const tab = [...document.querySelectorAll('.tab')].find(el => el.textContent.includes('Assignments'));
        if (tab && typeof openTab === 'function') openTab({ currentTarget: tab }, 'assignments');
        if (task && typeof getScheduler()?.editTask === 'function') {
            setTimeout(() => getScheduler().editTask(id), 50);
        }
    };

    window.snoozeSchedulerReminder = function (id) {
        const snoozes = JSON.parse(localStorage.getItem('schedulerReminderSnoozes') || '{}');
        snoozes[id] = Date.now() + DAY_MS;
        localStorage.setItem('schedulerReminderSnoozes', JSON.stringify(snoozes));
        const scheduler = getScheduler();
        if (scheduler) scheduler.showNotification('Reminder snoozed until tomorrow.', 'info');
        renderSmartReminders();
    };

    function honorSnoozes() {
        const originalCollect = collectReminders;
        collectReminders = function () {
            const now = Date.now();
            let snoozes = {};
            try { snoozes = JSON.parse(localStorage.getItem('schedulerReminderSnoozes') || '{}'); } catch (_) {}
            const result = originalCollect().filter(item => !snoozes[item.task.id] || Number(snoozes[item.task.id]) <= now);
            Object.keys(snoozes).forEach(id => {
                if (Number(snoozes[id]) <= now) delete snoozes[id];
            });
            localStorage.setItem('schedulerReminderSnoozes', JSON.stringify(snoozes));
            return result;
        };
    }

    function wireNotificationButton() {
        window.requestNotificationPermission = requestBrowserNotifications;
    }

    function initialize() {
        addAcademicHorizonPill();
        applySemesterOptions();
        honorSnoozes();
        overrideReminderMethods();
        patchArchivePrompt();
        renderReminderSettingsPanel();
        renderSmartReminders();
        wireNotificationButton();

        const observer = new MutationObserver(() => {
            applySemesterOptions();
            renderReminderSettingsPanel();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(() => {
            renderSmartReminders();
            sendBrowserReminderDigest(false);
        }, 5 * 60 * 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initialize, 0));
    } else {
        setTimeout(initialize, 0);
    }
})();
