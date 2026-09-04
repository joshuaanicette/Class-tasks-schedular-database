// Refinement layer for assessment-weekly-v7.js
(function () {
    'use strict';

    function app() {
        try { return typeof taskScheduler !== 'undefined' ? taskScheduler : null; }
        catch (_) { return null; }
    }

    function parseClock(value) {
        const match = String(value || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) return null;
        let hour = Number(match[1]);
        const minute = Number(match[2] || 0);
        const suffix = String(match[3] || '').toUpperCase();
        if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
        if (suffix) {
            if (hour < 1 || hour > 12) return null;
            if (suffix === 'PM' && hour !== 12) hour += 12;
            if (suffix === 'AM' && hour === 12) hour = 0;
        } else if (hour < 0 || hour > 23) {
            return null;
        }
        return {
            minutes: hour * 60 + minute,
            value24: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        };
    }

    function parseTimeFrame(value) {
        const parts = String(value || '').trim().split(/\s*(?:-|–|—|\bto\b)\s*/i);
        if (parts.length !== 2) return null;
        const start = parseClock(parts[0]);
        const end = parseClock(parts[1]);
        if (!start || !end || end.minutes <= start.minutes) return null;
        return { start, end };
    }

    function formatClock24(value) {
        const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return value || '';
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        const suffix = hour >= 12 ? 'PM' : 'AM';
        return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
    }

    function ensureTimeFrameUI() {
        const panel = document.getElementById('v7AssessmentPanel');
        const start = document.getElementById('v7AssessmentStart');
        const end = document.getElementById('v7AssessmentEnd');
        if (!panel || !start || !end) return;

        const startLabel = start.closest('label');
        const endLabel = end.closest('label');
        if (startLabel) startLabel.style.display = 'none';
        if (endLabel) endLabel.style.display = 'none';

        if (!document.getElementById('v8AssessmentTimeFrame')) {
            const label = document.createElement('label');
            label.id = 'v8AssessmentTimeFrameLabel';
            label.innerHTML = '<span>Time Frame</span><input type="text" id="v8AssessmentTimeFrame" placeholder="10:00 AM - 11:20 AM">';
            const fields = panel.querySelector('.v7-assessment-fields');
            fields?.appendChild(label);

            const input = document.getElementById('v8AssessmentTimeFrame');
            input?.addEventListener('input', syncHiddenTimes);
        }

        const note = panel.querySelector('.v7-assessment-note');
        if (note) note.textContent = 'Enter the full assessment time frame in one field, for example 10:00 AM - 11:20 AM.';
    }

    function syncHiddenTimes() {
        const frameInput = document.getElementById('v8AssessmentTimeFrame');
        const start = document.getElementById('v7AssessmentStart');
        const end = document.getElementById('v7AssessmentEnd');
        const dueDate = document.getElementById('dueDate');
        const assessmentDate = document.getElementById('v7AssessmentDate');
        if (!frameInput || !start || !end) return false;

        const parsed = parseTimeFrame(frameInput.value);
        if (!parsed) return false;
        start.value = parsed.start.value24;
        end.value = parsed.end.value24;
        if (dueDate && assessmentDate?.value) {
            dueDate.value = `${assessmentDate.value}T${parsed.start.value24}`;
        }
        return true;
    }

    function populateTimeFrame(task) {
        ensureTimeFrameUI();
        const input = document.getElementById('v8AssessmentTimeFrame');
        if (!input) return;

        if (task?.assessmentTimeFrame) {
            input.value = task.assessmentTimeFrame;
            syncHiddenTimes();
            return;
        }

        const start = task?.assessmentStartTime || document.getElementById('v7AssessmentStart')?.value || '';
        const end = task?.assessmentEndTime || document.getElementById('v7AssessmentEnd')?.value || '';
        input.value = start && end ? `${formatClock24(start)} - ${formatClock24(end)}` : '';
    }

    function validateTimeFrameForAssessment() {
        const type = String(document.getElementById('assignmentType')?.value || '').toLowerCase();
        const needsFrame = ['quiz', 'test', 'exam', 'midterm', 'final'].includes(type);
        if (!needsFrame) return true;
        const input = document.getElementById('v8AssessmentTimeFrame');
        const parsed = parseTimeFrame(input?.value || '');
        if (!parsed) {
            app()?.showNotification('Enter the assessment time frame like 10:00 AM - 11:20 AM.', 'error');
            return false;
        }
        syncHiddenTimes();
        return true;
    }

    function persistTimeFrame(taskId) {
        const scheduler = app();
        const task = scheduler?.tasks.find(item => Number(item.id) === Number(taskId));
        const input = document.getElementById('v8AssessmentTimeFrame');
        if (!task || !input || !parseTimeFrame(input.value)) return;
        task.assessmentTimeFrame = input.value.trim();
        scheduler.saveTasks?.();
    }

    function moveWeeklyTrackerToCalendar() {
        const tracker = document.getElementById('v7WeeklyTracker');
        const calendarGrid = document.getElementById('calendarGrid');
        const calendarView = calendarGrid?.closest('.calendar-view');
        if (!tracker || !calendarView) return;
        if (tracker.previousElementSibling === calendarView) return;
        calendarView.insertAdjacentElement('afterend', tracker);
    }

    function removeTodayAssignmentsSection() {
        const calendar = document.getElementById('calendar');
        if (!calendar) return;
        const heading = Array.from(calendar.querySelectorAll('.form-section h2')).find(el =>
            String(el.textContent || '').toLowerCase().includes("today's assignments")
        );
        heading?.closest('.form-section')?.remove();
    }

    function sortWeeklyTrackerByDueDate() {
        const scheduler = app();
        const tracker = document.getElementById('v7WeeklyTracker');
        if (!scheduler || !tracker) return;

        const taskById = new Map((scheduler.tasks || []).map(task => [Number(task.id), task]));
        tracker.querySelectorAll('.v7-day').forEach(day => {
            const cards = Array.from(day.querySelectorAll('.v7-week-task'));
            cards.sort((a, b) => {
                const taskA = taskById.get(Number(a.dataset.v7TaskId));
                const taskB = taskById.get(Number(b.dataset.v7TaskId));
                const dueA = taskA ? new Date(taskA.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                const dueB = taskB ? new Date(taskB.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                return dueA - dueB;
            });
            cards.forEach(card => day.appendChild(card));
        });

        const subtitle = tracker.querySelector('.v7-week-title p');
        if (subtitle && !subtitle.textContent.includes('sorted by due date')) {
            subtitle.textContent = `${subtitle.textContent} · sorted by due date/time`;
        }
    }

    function refreshCalendarAssignmentView() {
        moveWeeklyTrackerToCalendar();
        removeTodayAssignmentsSection();
        sortWeeklyTrackerByDueDate();
    }

    function patchScheduler() {
        const scheduler = app();
        if (!scheduler || scheduler.__assessmentCalendarV8) return false;

        const originalAddTask = scheduler.addTask.bind(scheduler);
        scheduler.addTask = function (...args) {
            if (!validateTimeFrameForAssessment()) return;
            const before = new Set(this.tasks.map(task => Number(task.id)));
            const result = originalAddTask(...args);
            const created = this.tasks.find(task => !before.has(Number(task.id)));
            if (created) persistTimeFrame(created.id);
            setTimeout(refreshCalendarAssignmentView, 0);
            return result;
        };

        const originalUpdateTask = scheduler.updateTask.bind(scheduler);
        scheduler.updateTask = function (...args) {
            const id = this.editingTaskId;
            if (!validateTimeFrameForAssessment()) return;
            const result = originalUpdateTask(...args);
            if (id) persistTimeFrame(id);
            setTimeout(refreshCalendarAssignmentView, 0);
            return result;
        };

        const originalEditTask = scheduler.editTask.bind(scheduler);
        scheduler.editTask = function (taskId, ...args) {
            const result = originalEditTask(taskId, ...args);
            const task = this.tasks.find(item => Number(item.id) === Number(taskId));
            setTimeout(() => populateTimeFrame(task), 0);
            return result;
        };

        const originalClear = scheduler.clearTaskForm?.bind(scheduler);
        if (originalClear) {
            scheduler.clearTaskForm = function (...args) {
                const result = originalClear(...args);
                const input = document.getElementById('v8AssessmentTimeFrame');
                if (input) input.value = '';
                ensureTimeFrameUI();
                return result;
            };
        }

        const originalRenderTasks = scheduler.renderTasks.bind(scheduler);
        scheduler.renderTasks = function (...args) {
            const result = originalRenderTasks(...args);
            setTimeout(refreshCalendarAssignmentView, 0);
            return result;
        };

        const originalRenderCalendar = scheduler.renderCalendar?.bind(scheduler);
        if (originalRenderCalendar) {
            scheduler.renderCalendar = function (...args) {
                const result = originalRenderCalendar(...args);
                setTimeout(refreshCalendarAssignmentView, 0);
                return result;
            };
        }

        scheduler.__assessmentCalendarV8 = true;
        return true;
    }

    function init() {
        if (!app()) return setTimeout(init, 100);
        ensureTimeFrameUI();
        patchScheduler();
        refreshCalendarAssignmentView();

        const type = document.getElementById('assignmentType');
        if (type && !type.dataset.v8FrameBound) {
            type.addEventListener('change', () => setTimeout(ensureTimeFrameUI, 0));
            type.dataset.v8FrameBound = 'true';
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 360));
    else setTimeout(init, 360);
})();