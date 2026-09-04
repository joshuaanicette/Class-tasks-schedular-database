// Unified Monday-Friday class schedule for Lecture, Lab, and Recitation.
(function () {
    'use strict';

    const WEEKDAYS = [
        ['Mon', 'Monday'],
        ['Tue', 'Tuesday'],
        ['Wed', 'Wednesday'],
        ['Thu', 'Thursday'],
        ['Fri', 'Friday']
    ];
    const WEEKDAY_CODES = new Set(WEEKDAYS.map(([code]) => code));
    const TYPE_META = {
        lecture: { label: 'Lecture', icon: '📘' },
        lab: { label: 'Lab', icon: '🧪' },
        recitation: { label: 'Recitation', icon: '🗣️' }
    };

    function app() {
        try { return typeof taskScheduler !== 'undefined' ? taskScheduler : null; }
        catch (_) { return null; }
    }

    function escapeHtml(value) {
        const el = document.createElement('div');
        el.textContent = value == null ? '' : String(value);
        return el.innerHTML;
    }

    function removeWeekendOptions() {
        ['meetingDays', 'v5-lab-days', 'v5-recitation-days'].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            Array.from(select.options).forEach(option => {
                if (option.value === 'Sat' || option.value === 'Sun') option.remove();
            });
        });

        const mainLabel = document.querySelector('label[for="meetingDays"]');
        if (mainLabel) mainLabel.textContent = 'Meeting Days (Monday–Friday; hold Ctrl/Cmd to select multiple)';
    }

    function componentList(course) {
        if (!Array.isArray(course?.components)) return [];
        return course.components
            .map(component => {
                const type = String(component?.type || '').toLowerCase();
                if (type !== 'lab' && type !== 'recitation') return null;
                return {
                    type,
                    meetingDays: Array.isArray(component.meetingDays)
                        ? component.meetingDays.filter(day => WEEKDAY_CODES.has(day))
                        : [],
                    meetingTime: component.meetingTime || null,
                    meetingEndTime: component.meetingEndTime || null
                };
            })
            .filter(Boolean);
    }

    function minutesFrom24Hour(value) {
        if (!value || !/^\d{1,2}:\d{2}$/.test(String(value))) return null;
        const [hour, minute] = String(value).split(':').map(Number);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
        return hour * 60 + minute;
    }

    function parseDisplayTime(value) {
        const match = String(value || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (!match) return Number.MAX_SAFE_INTEGER;
        let hour = Number(match[1]);
        const minute = Number(match[2] || 0);
        const suffix = String(match[3] || '').toUpperCase();
        if (suffix === 'PM' && hour !== 12) hour += 12;
        if (suffix === 'AM' && hour === 12) hour = 0;
        return hour * 60 + minute;
    }

    function formatTime(value) {
        const minutes = minutesFrom24Hour(value);
        if (minutes == null) return value || '';
        const hour24 = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const suffix = hour24 >= 12 ? 'PM' : 'AM';
        const hour = hour24 % 12 || 12;
        return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
    }

    function durationMinutes(start, end) {
        const startMinutes = minutesFrom24Hour(start);
        const endMinutes = minutesFrom24Hour(end);
        if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return null;
        return endMinutes - startMinutes;
    }

    function formatDuration(minutes) {
        if (!(minutes > 0)) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours && mins) return `${hours}h ${mins}m`;
        if (hours) return `${hours}h`;
        return `${mins}m`;
    }

    function componentTimeRange(component) {
        if (!component.meetingTime) return 'Time not set';
        if (!component.meetingEndTime) return formatTime(component.meetingTime);
        const duration = durationMinutes(component.meetingTime, component.meetingEndTime);
        const durationText = duration ? ` (${formatDuration(duration)})` : '';
        return `${formatTime(component.meetingTime)}–${formatTime(component.meetingEndTime)}${durationText}`;
    }

    function collectMeetings() {
        const meetings = [];
        (app()?.courses || []).forEach(course => {
            const lectureDays = Array.isArray(course.meetingDays)
                ? course.meetingDays.filter(day => WEEKDAY_CODES.has(day))
                : [];

            if (lectureDays.length && course.meetingTime) {
                lectureDays.forEach(day => {
                    meetings.push({
                        course,
                        type: 'lecture',
                        day,
                        timeText: course.meetingTime,
                        sortMinutes: parseDisplayTime(course.meetingTime)
                    });
                });
            }

            componentList(course).forEach(component => {
                if (!component.meetingTime || !component.meetingDays.length) return;
                component.meetingDays.forEach(day => {
                    meetings.push({
                        course,
                        type: component.type,
                        day,
                        timeText: componentTimeRange(component),
                        sortMinutes: minutesFrom24Hour(component.meetingTime) ?? Number.MAX_SAFE_INTEGER
                    });
                });
            });
        });
        return meetings;
    }

    function meetingCard(meeting) {
        const meta = TYPE_META[meeting.type] || TYPE_META.lecture;
        const code = meeting.course.code || meeting.course.name || 'Course';
        const name = meeting.course.name || '';
        return `<div class="v6-meeting-card v6-${meeting.type}">
            <div class="v6-meeting-title"><span>${meta.icon}</span><strong>${escapeHtml(code)}</strong><span class="v6-type-badge">${meta.label}</span></div>
            ${name && name !== code ? `<div class="v6-meeting-name">${escapeHtml(name)}</div>` : ''}
            <time>${escapeHtml(meeting.timeText)}</time>
        </div>`;
    }

    function renderUnifiedWeeklySchedule() {
        const container = document.getElementById('weeklyScheduleView');
        if (!container) return;
        removeWeekendOptions();

        const meetings = collectMeetings();
        container.innerHTML = `
            <div class="v6-weekly-summary">
                <strong>Monday–Friday class schedule</strong>
                <span>Lecture, lab, and recitation are shown together. Weekends remain available for assignments and due dates.</span>
            </div>
            <div class="v6-weekday-grid">
                ${WEEKDAYS.map(([dayCode, dayName]) => {
                    const dayMeetings = meetings
                        .filter(meeting => meeting.day === dayCode)
                        .sort((a, b) => a.sortMinutes - b.sortMinutes || String(a.course.code || a.course.name).localeCompare(String(b.course.code || b.course.name)));
                    return `<section class="v6-weekday-column">
                        <h3>${dayName}</h3>
                        <div class="v6-day-meetings">
                            ${dayMeetings.length ? dayMeetings.map(meetingCard).join('') : '<div class="v6-no-class">No class meetings</div>'}
                        </div>
                    </section>`;
                }).join('')}
            </div>`;
    }

    function injectStyles() {
        if (document.getElementById('v6WeeklyScheduleStyles')) return;
        const style = document.createElement('style');
        style.id = 'v6WeeklyScheduleStyles';
        style.textContent = `
            .v6-weekly-summary{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px;padding:11px 13px;border:1px solid var(--border-color);border-radius:11px;background:var(--hover-bg);color:var(--text-primary)}
            .v6-weekly-summary span{color:var(--text-secondary);font-size:.82rem}
            .v6-weekday-grid{display:grid;grid-template-columns:repeat(5,minmax(170px,1fr));gap:10px;overflow-x:auto;padding-bottom:5px}
            .v6-weekday-column{min-width:170px;border:1px solid var(--border-color);border-radius:12px;background:var(--card-bg);padding:10px}
            .v6-weekday-column h3{margin:0 0 9px;color:var(--text-primary);font-size:.92rem}
            .v6-day-meetings{display:grid;gap:8px}
            .v6-meeting-card{display:grid;gap:4px;padding:9px;border-radius:9px;background:var(--hover-bg);border-left:4px solid var(--accent)}
            .v6-meeting-card.v6-lab{border-left-style:dashed}
            .v6-meeting-card.v6-recitation{border-left-width:2px}
            .v6-meeting-title{display:flex;align-items:center;gap:5px;flex-wrap:wrap;color:var(--text-primary);font-size:.79rem}
            .v6-type-badge{display:inline-flex;padding:2px 6px;border-radius:999px;border:1px solid var(--border-color);background:var(--card-bg);font-size:.65rem;color:var(--text-secondary);font-weight:700}
            .v6-meeting-name{color:var(--text-secondary);font-size:.7rem}
            .v6-meeting-card time{color:var(--accent);font-size:.75rem;font-weight:750}
            .v6-no-class{padding:9px;color:var(--text-secondary);font-size:.74rem;text-align:center;border:1px dashed var(--border-color);border-radius:8px}
            @media(max-width:900px){.v6-weekday-grid{grid-template-columns:repeat(5,minmax(155px,1fr))}.v6-weekday-column{min-width:155px}}
        `;
        document.head.appendChild(style);
    }

    function patchScheduler() {
        const scheduler = app();
        if (!scheduler || scheduler.__weekdayUnifiedScheduleV6) return false;
        scheduler.renderWeeklySchedule = renderUnifiedWeeklySchedule;
        scheduler.__weekdayUnifiedScheduleV6 = true;
        return true;
    }

    function init() {
        if (!app()) return setTimeout(init, 100);
        injectStyles();
        removeWeekendOptions();
        patchScheduler();
        renderUnifiedWeeklySchedule();

        const form = document.getElementById('courseForm');
        if (form && !form.dataset.weekdayObserverV6) {
            const observer = new MutationObserver(() => removeWeekendOptions());
            observer.observe(form, { childList: true, subtree: true });
            form.dataset.weekdayObserverV6 = 'true';
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 240));
    else setTimeout(init, 240);
})();