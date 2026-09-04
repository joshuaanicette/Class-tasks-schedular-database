// Optional Lecture / Lab / Recitation components nested under one parent course.
(function () {
    'use strict';

    const TYPES = {
        lecture: { label: 'Lecture', icon: '📘' },
        lab: { label: 'Lab', icon: '🧪' },
        recitation: { label: 'Recitation', icon: '🗣️' }
    };

    const DAYS = [
        ['Mon', 'Monday'],
        ['Tue', 'Tuesday'],
        ['Wed', 'Wednesday'],
        ['Thu', 'Thursday'],
        ['Fri', 'Friday'],
        ['Sat', 'Saturday'],
        ['Sun', 'Sunday']
    ];

    const DAY_NAME = Object.fromEntries(DAYS);

    function app() {
        try { return typeof taskScheduler !== 'undefined' ? taskScheduler : null; }
        catch (_) { return null; }
    }

    function escapeHtml(value) {
        const el = document.createElement('div');
        el.textContent = value == null ? '' : String(value);
        return el.innerHTML;
    }

    function selectedValues(id) {
        const select = document.getElementById(id);
        return select ? Array.from(select.selectedOptions).map(option => option.value) : [];
    }

    function normalizeComponents(value) {
        if (!Array.isArray(value)) return [];
        return value
            .map(component => {
                const type = String(component.type || '').toLowerCase();
                if (!TYPES[type]) return null;
                return {
                    type,
                    label: TYPES[type].label,
                    credits: type === 'lecture' ? Math.max(0, Number(component.credits || 0)) : 0,
                    meetingDays: type === 'lecture' ? [] : (Array.isArray(component.meetingDays) ? component.meetingDays.filter(day => DAY_NAME[day]) : []),
                    meetingTime: type === 'lecture' ? null : (component.meetingTime || null)
                };
            })
            .filter(Boolean);
    }

    function selectedComponents() {
        const lectureEnabled = document.getElementById('v5-lecture-enabled')?.checked;
        const labEnabled = document.getElementById('v5-lab-enabled')?.checked;
        const recitationEnabled = document.getElementById('v5-recitation-enabled')?.checked;
        const lectureCredits = Math.max(0, Number(document.getElementById('v5-lecture-credits')?.value || document.getElementById('credits')?.value || 0));
        const components = [];

        if (lectureEnabled) {
            components.push({ type: 'lecture', label: 'Lecture', credits: lectureCredits, meetingDays: [], meetingTime: null });
        }
        if (labEnabled) {
            components.push({
                type: 'lab',
                label: 'Lab',
                credits: 0,
                meetingDays: selectedValues('v5-lab-days'),
                meetingTime: document.getElementById('v5-lab-time')?.value || null
            });
        }
        if (recitationEnabled) {
            components.push({
                type: 'recitation',
                label: 'Recitation',
                credits: 0,
                meetingDays: selectedValues('v5-recitation-days'),
                meetingTime: document.getElementById('v5-recitation-time')?.value || null
            });
        }
        return components;
    }

    function syncCredits() {
        const creditsInput = document.getElementById('credits');
        const lectureCredits = document.getElementById('v5-lecture-credits');
        const lectureEnabled = document.getElementById('v5-lecture-enabled')?.checked;
        const total = document.getElementById('v5ComponentCreditTotal');
        const note = document.getElementById('v5ComponentCreditNote');
        if (!creditsInput || !lectureCredits) return;

        if (lectureEnabled) {
            const value = Math.max(0, Number(lectureCredits.value || 0));
            creditsInput.value = String(value);
            creditsInput.readOnly = true;
            creditsInput.classList.add('v5-derived-credit');
            if (total) total.textContent = `${value.toFixed(1)} credits`;
        } else {
            creditsInput.readOnly = false;
            creditsInput.classList.remove('v5-derived-credit');
            if (total) total.textContent = `${Number(creditsInput.value || 0).toFixed(1)} credits`;
        }

        if (note) note.textContent = 'Lecture carries course credits. Lab and recitation are fixed at 0 credits but can have their own meeting days and times.';
    }

    function setRowState(type) {
        const enabled = document.getElementById(`v5-${type}-enabled`)?.checked;
        document.getElementById(`v5-${type}-row`)?.classList.toggle('is-enabled', Boolean(enabled));

        if (type === 'lecture') {
            const input = document.getElementById('v5-lecture-credits');
            if (input) input.disabled = !enabled;
        } else {
            const days = document.getElementById(`v5-${type}-days`);
            const time = document.getElementById(`v5-${type}-time`);
            if (days) days.disabled = !enabled;
            if (time) time.disabled = !enabled;
        }
        syncCredits();
    }

    function dayOptions() {
        return DAYS.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
    }

    function injectUI() {
        const credits = document.getElementById('credits');
        if (!credits || document.getElementById('v5CourseComponents')) return;
        const anchor = credits.closest('.form-row') || credits.closest('.form-group');
        if (!anchor) return;

        const panel = document.createElement('div');
        panel.id = 'v5CourseComponents';
        panel.className = 'v5-components-panel';
        panel.innerHTML = `
            <div class="v5-components-heading">
                <div>
                    <h4>Course components <span>optional</span></h4>
                    <p>Lecture uses the parent course schedule and carries the credits. Lab and recitation stay at 0 credits and can have separate attendance days and times.</p>
                </div>
                <div class="v5-component-total-badge"><small>Total course credits</small><strong id="v5ComponentCreditTotal">${Number(credits.value || 0).toFixed(1)} credits</strong></div>
            </div>
            <div class="v5-components-grid">
                <label class="v5-component-row" id="v5-lecture-row">
                    <span class="v5-component-check"><input type="checkbox" id="v5-lecture-enabled"><span>📘 Lecture</span></span>
                    <span class="v5-component-credit-input"><input type="number" id="v5-lecture-credits" min="0" max="10" step="0.5" disabled placeholder="4"><small>credits</small></span>
                    <span class="v5-parent-schedule-note">Uses course meeting days/time above</span>
                </label>
                <div class="v5-component-row v5-scheduled-component" id="v5-lab-row">
                    <label class="v5-component-check"><input type="checkbox" id="v5-lab-enabled"><span>🧪 Lab</span></label>
                    <span class="v5-fixed-credit">0 credits</span>
                    <div class="v5-component-schedule-fields">
                        <label><span>Days</span><select id="v5-lab-days" multiple disabled>${dayOptions()}</select></label>
                        <label><span>Time</span><input type="time" id="v5-lab-time" disabled></label>
                    </div>
                </div>
                <div class="v5-component-row v5-scheduled-component" id="v5-recitation-row">
                    <label class="v5-component-check"><input type="checkbox" id="v5-recitation-enabled"><span>🗣️ Recitation</span></label>
                    <span class="v5-fixed-credit">0 credits</span>
                    <div class="v5-component-schedule-fields">
                        <label><span>Days</span><select id="v5-recitation-days" multiple disabled>${dayOptions()}</select></label>
                        <label><span>Time</span><input type="time" id="v5-recitation-time" disabled></label>
                    </div>
                </div>
            </div>
            <div class="v5-component-note" id="v5ComponentCreditNote">Lecture carries course credits. Lab and recitation are fixed at 0 credits but can have their own meeting days and times.</div>`;
        anchor.insertAdjacentElement('afterend', panel);

        ['lecture', 'lab', 'recitation'].forEach(type => {
            document.getElementById(`v5-${type}-enabled`)?.addEventListener('change', () => setRowState(type));
        });
        document.getElementById('v5-lecture-credits')?.addEventListener('input', syncCredits);
        credits.addEventListener('input', () => {
            if (!document.getElementById('v5-lecture-enabled')?.checked) syncCredits();
        });
    }

    function setSelectedDays(id, days) {
        const select = document.getElementById(id);
        if (!select) return;
        const selected = new Set(days || []);
        Array.from(select.options).forEach(option => { option.selected = selected.has(option.value); });
    }

    function populate(course) {
        injectUI();
        const components = normalizeComponents(course?.components);
        const lecture = components.find(component => component.type === 'lecture');
        const lab = components.find(component => component.type === 'lab');
        const recitation = components.find(component => component.type === 'recitation');

        const lectureToggle = document.getElementById('v5-lecture-enabled');
        const labToggle = document.getElementById('v5-lab-enabled');
        const recitationToggle = document.getElementById('v5-recitation-enabled');
        const lectureCredits = document.getElementById('v5-lecture-credits');

        if (lectureToggle) lectureToggle.checked = Boolean(lecture);
        if (labToggle) labToggle.checked = Boolean(lab);
        if (recitationToggle) recitationToggle.checked = Boolean(recitation);
        if (lectureCredits) lectureCredits.value = lecture ? String(lecture.credits) : String(course?.credits || '');

        setSelectedDays('v5-lab-days', lab?.meetingDays || []);
        setSelectedDays('v5-recitation-days', recitation?.meetingDays || []);
        const labTime = document.getElementById('v5-lab-time');
        const recitationTime = document.getElementById('v5-recitation-time');
        if (labTime) labTime.value = lab?.meetingTime || '';
        if (recitationTime) recitationTime.value = recitation?.meetingTime || '';

        ['lecture', 'lab', 'recitation'].forEach(setRowState);
        syncCredits();
    }

    function reset() {
        ['lecture', 'lab', 'recitation'].forEach(type => {
            const toggle = document.getElementById(`v5-${type}-enabled`);
            if (toggle) toggle.checked = false;
            document.getElementById(`v5-${type}-row`)?.classList.remove('is-enabled');
        });

        const lectureCredits = document.getElementById('v5-lecture-credits');
        if (lectureCredits) {
            lectureCredits.value = '';
            lectureCredits.disabled = true;
        }

        ['lab', 'recitation'].forEach(type => {
            setSelectedDays(`v5-${type}-days`, []);
            const days = document.getElementById(`v5-${type}-days`);
            const time = document.getElementById(`v5-${type}-time`);
            if (days) days.disabled = true;
            if (time) {
                time.value = '';
                time.disabled = true;
            }
        });

        const credits = document.getElementById('credits');
        if (credits) {
            credits.readOnly = false;
            credits.classList.remove('v5-derived-credit');
        }
        syncCredits();
    }

    function saveComponents(courseId, components) {
        const scheduler = app();
        const course = scheduler?.courses.find(item => Number(item.id) === Number(courseId));
        if (!course) return;
        const normalized = normalizeComponents(components);
        course.components = normalized;
        const lecture = normalized.find(component => component.type === 'lecture');
        if (lecture) course.credits = lecture.credits;
        scheduler.saveCourses();
        scheduler.renderCourses();
        scheduler.updateCourseSelect();
        scheduler.updateGradeCalcCourseSelect();
        scheduler.updateWhatIfCourseSelect?.();
        scheduler.renderProgress?.();
        scheduler.renderTimeStatistics?.();
        scheduler.renderWeeklySchedule?.();
    }

    function formatTime(value) {
        if (!value) return 'Time not set';
        const [hourString, minuteString] = String(value).split(':');
        const hour = Number(hourString);
        const minute = Number(minuteString || 0);
        if (!Number.isFinite(hour)) return value;
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
    }

    function scheduleText(component) {
        if (component.type === 'lecture') return 'Uses course schedule';
        const days = (component.meetingDays || []).map(day => DAY_NAME[day] || day).join(', ');
        const time = component.meetingTime ? formatTime(component.meetingTime) : '';
        if (!days && !time) return 'Schedule not set';
        return [days || 'Days not set', time || 'Time not set'].join(' · ');
    }

    function componentSummary(course) {
        const components = normalizeComponents(course?.components);
        if (!components.length) return '';
        return `<div class="v5-course-components">
            <div class="v5-component-total"><span>Course structure</span><strong>${Number(course.credits || 0).toFixed(1)} total credits</strong></div>
            <div class="v5-component-chips">${components.map(component => {
                const meta = TYPES[component.type];
                return `<span class="v5-component-chip"><span>${meta.icon} ${meta.label}</span><strong>${component.credits.toFixed(1)} cr</strong><small>${escapeHtml(scheduleText(component))}</small></span>`;
            }).join('')}</div>
        </div>`;
    }

    function componentMeetings() {
        const meetings = [];
        (app()?.courses || []).forEach(course => {
            normalizeComponents(course.components)
                .filter(component => component.type !== 'lecture' && component.meetingDays.length && component.meetingTime)
                .forEach(component => {
                    component.meetingDays.forEach(day => {
                        meetings.push({ course, component, day, time: component.meetingTime });
                    });
                });
        });
        return meetings;
    }

    function appendComponentSchedule() {
        const container = document.getElementById('weeklyScheduleView');
        if (!container) return;
        container.querySelector('.v5-weekly-components')?.remove();

        const meetings = componentMeetings();
        if (!meetings.length) return;

        const section = document.createElement('div');
        section.className = 'v5-weekly-components';
        section.innerHTML = `
            <div class="v5-weekly-heading">
                <h3>🧪 Lab & Recitation Meetings</h3>
                <p>Separate 0-credit attendance meetings attached to their parent courses.</p>
            </div>
            <div class="v5-weekly-grid">
                ${DAYS.map(([dayCode, dayName]) => {
                    const dayMeetings = meetings
                        .filter(meeting => meeting.day === dayCode)
                        .sort((a, b) => String(a.time).localeCompare(String(b.time)));
                    return `<div class="v5-weekly-day">
                        <h4>${dayName}</h4>
                        ${dayMeetings.length ? dayMeetings.map(meeting => {
                            const meta = TYPES[meeting.component.type];
                            return `<div class="v5-weekly-meeting">
                                <strong>${meta.icon} ${escapeHtml(meeting.course.code || meeting.course.name)} ${meta.label}</strong>
                                <span>${escapeHtml(meeting.course.name)}</span>
                                <time>${escapeHtml(formatTime(meeting.time))}</time>
                            </div>`;
                        }).join('') : '<span class="v5-no-meeting">—</span>'}
                    </div>`;
                }).join('')}
            </div>`;
        container.appendChild(section);
    }

    function patchBehavior() {
        const scheduler = app();
        if (!scheduler || scheduler.__courseComponentsV5) return;

        const originalAdd = scheduler.addCourse.bind(scheduler);
        scheduler.addCourse = function (...args) {
            const components = selectedComponents();
            const before = new Set(this.courses.map(course => Number(course.id)));
            const result = originalAdd(...args);
            const created = this.courses.find(course => !before.has(Number(course.id)));
            if (created) saveComponents(created.id, components);
            reset();
            return result;
        };

        const originalUpdate = scheduler.updateCourse.bind(scheduler);
        scheduler.updateCourse = function (...args) {
            const id = this.editingCourseId;
            const components = selectedComponents();
            const result = originalUpdate(...args);
            if (id && this.courses.some(course => Number(course.id) === Number(id))) saveComponents(id, components);
            reset();
            return result;
        };

        const originalEdit = scheduler.editCourse.bind(scheduler);
        scheduler.editCourse = function (courseId, ...args) {
            const result = originalEdit(courseId, ...args);
            populate(this.courses.find(course => Number(course.id) === Number(courseId)));
            return result;
        };

        const originalClear = scheduler.clearCourseForm.bind(scheduler);
        scheduler.clearCourseForm = function (...args) {
            const result = originalClear(...args);
            reset();
            return result;
        };

        const originalCreateHtml = scheduler.createCourseHTML.bind(scheduler);
        scheduler.createCourseHTML = function (course, ...args) {
            const html = originalCreateHtml(course, ...args);
            const summary = componentSummary(course);
            return summary ? html.replace('<div class="course-stats">', `${summary}<div class="course-stats">`) : html;
        };

        if (typeof scheduler.renderWeeklySchedule === 'function') {
            const originalWeeklySchedule = scheduler.renderWeeklySchedule.bind(scheduler);
            scheduler.renderWeeklySchedule = function (...args) {
                const result = originalWeeklySchedule(...args);
                appendComponentSchedule();
                return result;
            };
        }

        scheduler.__courseComponentsV5 = true;
    }

    function loadStyles() {
        if (document.querySelector('link[data-course-components-v5]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './course-components-v5.css';
        link.dataset.courseComponentsV5 = 'true';
        document.head.appendChild(link);
    }

    function init() {
        if (!app()) return setTimeout(init, 100);
        loadStyles();
        injectUI();
        patchBehavior();
        app().renderCourses?.();
        app().renderWeeklySchedule?.();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 140));
    else setTimeout(init, 140);
})();