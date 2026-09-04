// Class-based workload tracking and more accurate grade calculations.
(function () {
    'use strict';

    const DAY_MS = 86400000;
    const DEFAULT_STUDY_HOURS_PER_CREDIT = 2;
    const CLASS_TIME_KEY = 'schedulerClassTimeEntriesV4';
    const MULTIPLIER_KEY = 'schedulerCourseStudyMultipliersV4';

    function app() {
        try { return typeof taskScheduler !== 'undefined' ? taskScheduler : null; }
        catch (_) { return null; }
    }

    function escapeHtml(value) {
        const el = document.createElement('div');
        el.textContent = value == null ? '' : String(value);
        return el.innerHTML;
    }

    function parseLocalDate(value) {
        const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0, 0);
    }

    function dateKey(value) {
        const d = new Date(value);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function startOfWeek(value) {
        const d = new Date(value);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
        return d;
    }

    function endOfWeek(value) {
        const d = startOfWeek(value);
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    function formatShort(value) {
        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function loadJson(key, fallback) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || 'null');
            return parsed == null ? fallback : parsed;
        } catch (_) { return fallback; }
    }

    function loadEntries() {
        const entries = loadJson(CLASS_TIME_KEY, []);
        return Array.isArray(entries) ? entries : [];
    }

    function saveEntries(entries) {
        localStorage.setItem(CLASS_TIME_KEY, JSON.stringify(entries));
    }

    function loadMultipliers() {
        const value = loadJson(MULTIPLIER_KEY, {});
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function studyMultiplier(courseId) {
        const value = Number(loadMultipliers()[String(courseId)]);
        return value > 0 ? value : DEFAULT_STUDY_HOURS_PER_CREDIT;
    }

    function weeklyTarget(course) {
        return Number(course?.credits || 0) * studyMultiplier(course?.id);
    }

    function migrateAssignmentLogs() {
        if (localStorage.getItem('schedulerClassTimeMigrationV4') === 'done') return;
        const old = loadJson('schedulerActualTimeEntries', []);
        const current = loadEntries();
        const existingIds = new Set(current.map(entry => String(entry.migratedFrom || '')));
        const scheduler = app();
        if (Array.isArray(old) && scheduler) {
            old.forEach(entry => {
                if (existingIds.has(String(entry.id))) return;
                const task = scheduler.tasks.find(t => Number(t.id) === Number(entry.taskId));
                const courseId = Number(entry.courseId || task?.courseId || 0);
                if (!courseId || !entry.date || Number(entry.hours) <= 0) return;
                current.push({
                    id: `migrated-${entry.id}`,
                    courseId,
                    date: String(entry.date).slice(0, 10),
                    hours: Number(entry.hours),
                    note: entry.note || (task?.title ? `Migrated from ${task.title}` : 'Migrated assignment time'),
                    createdAt: entry.createdAt || new Date().toISOString(),
                    migratedFrom: String(entry.id)
                });
            });
            saveEntries(current);
        }
        localStorage.setItem('schedulerClassTimeMigrationV4', 'done');
    }

    function entriesBetween(start, end, courseId) {
        return loadEntries().filter(entry => {
            const date = parseLocalDate(entry.date);
            const courseMatch = courseId == null || Number(entry.courseId) === Number(courseId);
            return courseMatch && date >= start && date <= end;
        });
    }

    function sumHours(entries) {
        return entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    }

    function courseById(id) {
        return app()?.courses.find(course => Number(course.id) === Number(id));
    }

    let selectedWeek = startOfWeek(new Date());
    let chartCourseId = 'all';

    function weekActual(courseId, week) {
        return sumHours(entriesBetween(startOfWeek(week), endOfWeek(week), courseId));
    }

    function totalWeeklyTarget() {
        return (app()?.courses || []).reduce((sum, course) => sum + weeklyTarget(course), 0);
    }

    function dailyHoursForCourse(courseId, week) {
        const start = startOfWeek(week);
        const totals = Array(7).fill(0);
        entriesBetween(start, endOfWeek(week), courseId).forEach(entry => {
            const d = parseLocalDate(entry.date);
            const index = Math.round((startOfWeek(d) - start) / (7 * DAY_MS)) === 0 ? ((d.getDay() + 6) % 7) : -1;
            if (index >= 0 && index < 7) totals[index] += Number(entry.hours || 0);
        });
        return totals;
    }

    function renderClassOptions() {
        const courses = app()?.courses || [];
        return courses.map(course => `<option value="${Number(course.id)}">${escapeHtml(course.code || '')} — ${escapeHtml(course.name)}</option>`).join('');
    }

    function renderWorkloadTracker() {
        const container = document.getElementById('estimatedVsActual');
        const scheduler = app();
        if (!container || !scheduler) return;

        const courses = scheduler.courses || [];
        const weekStart = startOfWeek(selectedWeek);
        const weekEnd = endOfWeek(selectedWeek);
        const actualTotal = weekActual(null, weekStart);
        const targetTotal = totalWeeklyTarget();
        const variance = actualTotal - targetTotal;

        const rows = courses.map(course => {
            const target = weeklyTarget(course);
            const actual = weekActual(course.id, weekStart);
            const diff = actual - target;
            const daily = dailyHoursForCourse(course.id, weekStart);
            return `<tr>
                <td><strong>${escapeHtml(course.code || course.name)}</strong><small>${escapeHtml(course.name)}</small></td>
                <td>${Number(course.credits || 0).toFixed(1)}</td>
                <td><div class="v4-multiplier-control"><input class="v4-study-multiplier" data-course-id="${Number(course.id)}" type="number" min="0.25" max="8" step="0.25" value="${studyMultiplier(course.id)}"><span>h/credit</span></div></td>
                ${daily.map(value => `<td class="v4-day-cell">${value ? value.toFixed(1) : '—'}</td>`).join('')}
                <td><strong>${target.toFixed(1)}h</strong></td>
                <td><strong>${actual.toFixed(1)}h</strong></td>
                <td class="${diff > 0 ? 'v4-over' : diff < 0 ? 'v4-under' : ''}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}h</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="v4-workload">
                <div class="v4-section-header">
                    <div><h3>Class Study / Workload Tracker</h3><p>Default weekly estimate = course credits × ${DEFAULT_STUDY_HOURS_PER_CREDIT} independent study hours. Adjust any class multiplier to match its real difficulty.</p></div>
                    <div class="v4-week-nav"><button id="v4PrevWeek">←</button><button id="v4ThisWeek">This week</button><button id="v4NextWeek">→</button></div>
                </div>
                <div class="v4-week-label">${formatShort(weekStart)} – ${formatShort(weekEnd)}, ${weekEnd.getFullYear()}</div>
                <div class="v4-summary-grid">
                    <div class="v4-summary"><span>Estimated this week</span><strong>${targetTotal.toFixed(1)}h</strong></div>
                    <div class="v4-summary"><span>Actual logged</span><strong>${actualTotal.toFixed(1)}h</strong></div>
                    <div class="v4-summary"><span>Difference</span><strong class="${variance > 0 ? 'v4-over' : variance < 0 ? 'v4-under' : ''}">${variance >= 0 ? '+' : ''}${variance.toFixed(1)}h</strong></div>
                    <div class="v4-summary"><span>Target completion</span><strong>${targetTotal > 0 ? ((actualTotal / targetTotal) * 100).toFixed(0) + '%' : '—'}</strong></div>
                </div>

                <div class="v4-log-panel">
                    <h4>Log study / work time by class</h4>
                    <div class="v4-log-grid">
                        <div><label>Class</label><select id="v4TimeCourse"><option value="">Choose class...</option>${renderClassOptions()}</select></div>
                        <div><label>Date</label><input type="date" id="v4TimeDate" value="${dateKey(new Date())}"></div>
                        <div><label>Hours</label><input type="number" id="v4TimeHours" min="0.1" max="24" step="0.25" placeholder="1.5"></div>
                        <div><label>What did you work on?</label><input type="text" id="v4TimeNote" maxlength="140" placeholder="Lecture review, lab, homework, exam prep..."></div>
                        <button class="reminder-action-btn primary" id="v4LogTime">+ Log time</button>
                    </div>
                </div>

                <div class="v4-table-wrap"><table class="v4-workload-table"><thead><tr><th>Class</th><th>Credits</th><th>Study target</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th><th>Est.</th><th>Actual</th><th>Δ</th></tr></thead><tbody>${rows || '<tr><td colspan="13">Add courses to calculate workload.</td></tr>'}</tbody></table></div>

                ${renderWorkloadChart()}
                ${renderRecentLogs()}
            </div>`;

        document.getElementById('v4PrevWeek')?.addEventListener('click', () => { selectedWeek.setDate(selectedWeek.getDate() - 7); renderAllTimeViews(); });
        document.getElementById('v4NextWeek')?.addEventListener('click', () => { selectedWeek.setDate(selectedWeek.getDate() + 7); renderAllTimeViews(); });
        document.getElementById('v4ThisWeek')?.addEventListener('click', () => { selectedWeek = startOfWeek(new Date()); renderAllTimeViews(); });
        document.getElementById('v4LogTime')?.addEventListener('click', addClassTimeEntry);
        document.getElementById('v4ChartCourse')?.addEventListener('change', event => { chartCourseId = event.target.value; renderAllTimeViews(); });
        document.querySelectorAll('.v4-study-multiplier').forEach(input => input.addEventListener('change', saveMultiplier));
    }

    function saveMultiplier(event) {
        const id = String(event.target.dataset.courseId);
        const value = Number(event.target.value);
        const multipliers = loadMultipliers();
        if (value > 0) multipliers[id] = value;
        else delete multipliers[id];
        localStorage.setItem(MULTIPLIER_KEY, JSON.stringify(multipliers));
        renderAllTimeViews();
    }

    function addClassTimeEntry() {
        const courseId = Number(document.getElementById('v4TimeCourse')?.value || 0);
        const date = document.getElementById('v4TimeDate')?.value;
        const hours = Number(document.getElementById('v4TimeHours')?.value || 0);
        const note = document.getElementById('v4TimeNote')?.value?.trim() || '';
        if (!courseId || !date || !(hours > 0)) {
            app()?.showNotification('Choose a class, date, and number of hours.', 'error');
            return;
        }
        const entries = loadEntries();
        entries.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, courseId, date, hours: Math.round(hours * 100) / 100, note, createdAt: new Date().toISOString() });
        saveEntries(entries);
        selectedWeek = startOfWeek(parseLocalDate(date));
        renderAllTimeViews();
        app()?.showNotification(`${hours}h logged for ${courseById(courseId)?.code || 'class'}.`, 'success');
    }

    window.deleteClassTimeEntryV4 = function (id) {
        saveEntries(loadEntries().filter(entry => String(entry.id) !== String(id)));
        renderAllTimeViews();
        app()?.showNotification('Study-time entry deleted.', 'info');
    };

    function renderRecentLogs() {
        const start = startOfWeek(selectedWeek);
        const logs = entriesBetween(start, endOfWeek(start), null).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
        if (!logs.length) return '<div class="v4-empty">No actual study/work time logged for this week yet.</div>';
        return `<div class="v4-recent-logs"><h4>Daily entries this week</h4>${logs.map(entry => {
            const course = courseById(entry.courseId);
            return `<div class="v4-log-row"><div><strong>${escapeHtml(course?.code || course?.name || 'Deleted class')}</strong><small>${escapeHtml(entry.date)}${entry.note ? ' · ' + escapeHtml(entry.note) : ''}</small></div><span>${Number(entry.hours).toFixed(2).replace(/\.00$/, '')}h</span><button onclick="window.deleteClassTimeEntryV4('${escapeHtml(entry.id)}')">Delete</button></div>`;
        }).join('')}</div>`;
    }

    function chartSeries() {
        const points = [];
        const base = startOfWeek(selectedWeek);
        for (let offset = -7; offset <= 0; offset++) {
            const week = new Date(base);
            week.setDate(week.getDate() + offset * 7);
            let estimate = 0;
            let actual = 0;
            if (chartCourseId === 'all') {
                estimate = totalWeeklyTarget();
                actual = weekActual(null, week);
            } else {
                const course = courseById(Number(chartCourseId));
                estimate = weeklyTarget(course);
                actual = weekActual(Number(chartCourseId), week);
            }
            points.push({ label: formatShort(week), estimate, actual });
        }
        return points;
    }

    function renderWorkloadChart() {
        const courses = app()?.courses || [];
        if (!courses.length) return '';
        const points = chartSeries();
        const max = Math.max(1, ...points.flatMap(point => [point.estimate, point.actual]));
        const width = 760, height = 250, padL = 42, padR = 18, padT = 18, padB = 48;
        const plotW = width - padL - padR, plotH = height - padT - padB;
        const group = plotW / points.length;
        const barW = Math.min(24, group * 0.28);
        let bars = '';
        let labels = '';
        let grid = '';
        for (let i = 0; i <= 4; i++) {
            const value = max * (i / 4);
            const y = padT + plotH - plotH * (i / 4);
            grid += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" class="v4-chart-grid"/><text x="${padL - 7}" y="${y + 4}" text-anchor="end" class="v4-chart-axis">${value.toFixed(0)}h</text>`;
        }
        points.forEach((point, index) => {
            const center = padL + group * index + group / 2;
            const estH = (point.estimate / max) * plotH;
            const actH = (point.actual / max) * plotH;
            bars += `<rect x="${center - barW - 2}" y="${padT + plotH - estH}" width="${barW}" height="${estH}" rx="4" class="v4-est-bar"><title>Estimated: ${point.estimate.toFixed(1)}h</title></rect>`;
            bars += `<rect x="${center + 2}" y="${padT + plotH - actH}" width="${barW}" height="${actH}" rx="4" class="v4-act-bar"><title>Actual: ${point.actual.toFixed(1)}h</title></rect>`;
            labels += `<text x="${center}" y="${height - 18}" text-anchor="middle" class="v4-chart-axis">${escapeHtml(point.label)}</text>`;
        });
        const options = `<option value="all"${chartCourseId === 'all' ? ' selected' : ''}>All classes</option>` + courses.map(course => `<option value="${Number(course.id)}"${String(chartCourseId) === String(course.id) ? ' selected' : ''}>${escapeHtml(course.code || course.name)}</option>`).join('');
        return `<div class="v4-chart-section"><div class="v4-chart-title"><div><h4>Estimated vs actual — last 8 weeks</h4><div class="v4-chart-legend"><span><i class="v4-legend-est"></i>Estimated</span><span><i class="v4-legend-act"></i>Actual</span></div></div><select id="v4ChartCourse">${options}</select></div><div class="v4-chart-scroll"><svg class="v4-workload-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Estimated versus actual study hours over eight weeks">${grid}${bars}${labels}</svg></div></div>`;
    }

    function actualHoursBetween(start, end) {
        return sumHours(entriesBetween(start, end, null));
    }

    function renderTopTimeStats() {
        const now = new Date();
        const weekHours = actualHoursBetween(startOfWeek(now), endOfWeek(now));
        const monthHours = actualHoursBetween(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
        const allHours = sumHours(loadEntries());
        const weekEl = document.getElementById('totalTimeWeek');
        const monthEl = document.getElementById('totalTimeMonth');
        const semesterEl = document.getElementById('totalTimeSemester');
        const avgEl = document.getElementById('averageTimeDay');
        if (weekEl) weekEl.textContent = weekHours.toFixed(1) + 'h';
        if (monthEl) monthEl.textContent = monthHours.toFixed(1) + 'h';
        if (semesterEl) semesterEl.textContent = allHours.toFixed(1) + 'h';
        if (avgEl) avgEl.textContent = (weekHours / 7).toFixed(1) + 'h';
    }

    function renderCourseTimeBreakdown() {
        const container = document.getElementById('timeBreakdownByCourse');
        const courses = app()?.courses || [];
        if (!container) return;
        const totals = courses.map(course => ({ course, hours: sumHours(loadEntries().filter(entry => Number(entry.courseId) === Number(course.id))) })).filter(item => item.hours > 0);
        const total = totals.reduce((sum, item) => sum + item.hours, 0);
        container.innerHTML = totals.length ? totals.map(item => `<div class="v4-course-time-row"><div><strong>${escapeHtml(item.course.code || item.course.name)}</strong><small>${escapeHtml(item.course.name)}</small></div><span>${item.hours.toFixed(1)}h · ${((item.hours / total) * 100).toFixed(0)}%</span></div>`).join('') : '<p class="v4-empty">No actual class study time logged yet.</p>';
    }

    function hideAssignmentEstimate() {
        const input = document.getElementById('estimatedTime');
        if (!input) return;
        const group = input.closest('.form-group');
        if (group) {
            group.style.display = 'none';
            group.dataset.replacedByClassWorkload = 'true';
        }
    }

    // -----------------------------
    // Improved grade engine
    // -----------------------------
    const LETTER_PERCENT = { 'A+': 97, 'A': 93, 'A-': 90, 'B+': 87, 'B': 83, 'B-': 80, 'C+': 77, 'C': 73, 'C-': 70, 'D+': 67, 'D': 65, 'F': 0 };

    function parseTaskScore(task) {
        if (task == null || task.grade == null || String(task.grade).trim() === '') return null;
        const raw = String(task.grade).trim().toUpperCase();
        const maxPoints = Number(task.maxPoints || 100) > 0 ? Number(task.maxPoints || 100) : 100;
        if (LETTER_PERCENT[raw] != null) {
            const percent = LETTER_PERCENT[raw];
            return { percent, earned: maxPoints * percent / 100, possible: maxPoints, display: `${raw} (${percent.toFixed(1)}%)` };
        }
        const slash = raw.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
        if (slash) {
            const earned = Number(slash[1]);
            const possible = Number(slash[2]);
            if (possible > 0) return { percent: earned / possible * 100, earned, possible, display: `${earned}/${possible}` };
        }
        const value = Number.parseFloat(raw.replace('%', ''));
        if (!Number.isFinite(value)) return null;
        if (raw.includes('%')) return { percent: value, earned: maxPoints * value / 100, possible: maxPoints, display: `${value}%` };
        return { percent: value / maxPoints * 100, earned: value, possible: maxPoints, display: `${value}/${maxPoints}` };
    }

    function categoryMetrics(courseId) {
        const scheduler = app();
        const course = scheduler?.courses.find(c => Number(c.id) === Number(courseId));
        if (!course) return [];
        return (course.gradeCategories || []).map(category => {
            const tasks = scheduler.tasks.filter(task => Number(task.courseId) === Number(courseId) && task.category === category.name);
            const graded = tasks.map(task => ({ task, score: parseTaskScore(task) })).filter(item => item.score);
            const earned = graded.reduce((sum, item) => sum + item.score.earned, 0);
            const possible = graded.reduce((sum, item) => sum + item.score.possible, 0);
            const percent = possible > 0 ? earned / possible * 100 : null;
            const weight = Number(category.weight || 0);
            return { category, tasks, graded, earned, possible, percent, weight, contribution: percent == null ? 0 : percent * weight / 100 };
        });
    }

    function courseGradeMetrics(courseId) {
        const categories = categoryMetrics(courseId);
        const active = categories.filter(item => item.percent != null && item.weight > 0);
        const activeWeight = active.reduce((sum, item) => sum + item.weight, 0);
        const weightedContribution = active.reduce((sum, item) => sum + item.contribution, 0);
        const currentPercent = activeWeight > 0 ? weightedContribution / activeWeight * 100 : null;
        return { categories, activeWeight, weightedContribution, currentPercent };
    }

    function letterForPercent(percent) {
        if (percent == null) return null;
        if (percent >= 97) return 'A+';
        if (percent >= 93) return 'A';
        if (percent >= 90) return 'A-';
        if (percent >= 87) return 'B+';
        if (percent >= 83) return 'B';
        if (percent >= 80) return 'B-';
        if (percent >= 77) return 'C+';
        if (percent >= 73) return 'C';
        if (percent >= 70) return 'C-';
        if (percent >= 67) return 'D+';
        if (percent >= 65) return 'D';
        return 'F';
    }

    function targetPercent(course) {
        if (!course?.targetGrade) return null;
        const raw = String(course.targetGrade).trim().toUpperCase();
        if (LETTER_PERCENT[raw] != null) return LETTER_PERCENT[raw];
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) ? value : null;
    }

    function renderGradeCalculatorV4() {
        const scheduler = app();
        const select = document.getElementById('gradeCalcCourseSelect');
        const content = document.getElementById('gradeCalculatorContent');
        if (!scheduler || !select || !content) return;
        const courseId = Number(select.value || 0);
        if (!courseId) { content.innerHTML = ''; return; }
        const course = scheduler.courses.find(c => Number(c.id) === courseId);
        if (!course) return;
        const metrics = courseGradeMetrics(courseId);
        const target = targetPercent(course);
        const current = metrics.currentPercent;
        const currentLetter = letterForPercent(current);
        const targetGap = current != null && target != null ? current - target : null;

        const categoryRows = metrics.categories.map(item => `<tr>
            <td><strong>${escapeHtml(item.category.name)}</strong><small>${item.graded.length}/${item.tasks.length} graded</small></td>
            <td>${item.weight.toFixed(1)}%</td>
            <td>${item.possible > 0 ? `${item.earned.toFixed(1)} / ${item.possible.toFixed(1)}` : '—'}</td>
            <td>${item.percent == null ? '—' : item.percent.toFixed(1) + '%'}</td>
            <td>${item.percent == null ? '—' : item.contribution.toFixed(2) + ' pts'}</td>
        </tr>`).join('');

        const assignments = metrics.categories.flatMap(item => item.graded.map(graded => ({ ...graded, category: item.category.name }))).sort((a, b) => new Date(b.task.dueDate) - new Date(a.task.dueDate));
        const assignmentRows = assignments.map(item => `<tr><td><strong>${escapeHtml(item.task.title)}</strong><small>${escapeHtml(item.category)}</small></td><td>${escapeHtml(item.score.display)}</td><td>${item.score.percent.toFixed(1)}%</td></tr>`).join('');

        content.innerHTML = `
            <div class="v4-grade-dashboard">
                <div class="v4-grade-summary">
                    <div class="v4-grade-hero"><span>Current normalized grade</span><strong>${current == null ? '—' : current.toFixed(1) + '%'}</strong><em>${currentLetter || 'No grades yet'}</em></div>
                    <div class="v4-grade-stat"><span>Graded category weight</span><strong>${metrics.activeWeight.toFixed(1)}%</strong></div>
                    <div class="v4-grade-stat"><span>Secured toward final</span><strong>${metrics.weightedContribution.toFixed(2)} pts</strong></div>
                    <div class="v4-grade-stat"><span>Target</span><strong>${target == null ? (course.targetGrade || '—') : target.toFixed(0) + '%'}${targetGap == null ? '' : `<small class="${targetGap >= 0 ? 'v4-under' : 'v4-over'}">${targetGap >= 0 ? '+' : ''}${targetGap.toFixed(1)} pts vs target</small>`}</strong></div>
                </div>
                <div class="v4-grade-note"><strong>How this is calculated:</strong> assignments inside a category are combined by points earned ÷ points possible. Category percentages are then multiplied by the syllabus category weights. Categories with no grades yet are excluded from the current normalized grade, but their weight remains visible.</div>
                <h4>Category performance</h4>
                <div class="v4-table-wrap"><table class="v4-grade-table"><thead><tr><th>Category</th><th>Weight</th><th>Points</th><th>Average</th><th>Final-grade contribution</th></tr></thead><tbody>${categoryRows || '<tr><td colspan="5">No grade categories configured.</td></tr>'}</tbody></table></div>
                <h4>Graded assignments</h4>
                <div class="v4-table-wrap"><table class="v4-grade-table"><thead><tr><th>Assignment</th><th>Score</th><th>Percent</th></tr></thead><tbody>${assignmentRows || '<tr><td colspan="3">No assignment grades entered yet.</td></tr>'}</tbody></table></div>
            </div>`;
    }

    function improveGradeInputs() {
        const grade = document.getElementById('assignmentGrade');
        const max = document.getElementById('maxPoints');
        if (grade) {
            const label = document.querySelector('label[for="assignmentGrade"]');
            if (label) label.textContent = 'Points Earned / Grade';
            grade.placeholder = '45, 88%, 45/50, A-';
        }
        if (max) {
            const label = document.querySelector('label[for="maxPoints"]');
            if (label) label.textContent = 'Points Possible';
        }
    }

    function patchGradeEngine() {
        const scheduler = app();
        if (!scheduler || scheduler.__gradeEngineV4) return;

        scheduler.calculateCourseGrade = function (courseId) {
            const percent = courseGradeMetrics(courseId).currentPercent;
            return percent == null ? null : letterForPercent(percent);
        };

        scheduler.renderGradeCalculator = renderGradeCalculatorV4;

        // Preserve original form save behavior, then refresh enhanced grade/time views.
        ['addTask', 'updateTask', 'completeTask', 'deleteTask', 'addCourse', 'updateCourse'].forEach(method => {
            if (typeof scheduler[method] !== 'function') return;
            const original = scheduler[method].bind(scheduler);
            scheduler[method] = function (...args) {
                const result = original(...args);
                setTimeout(() => {
                    renderAllTimeViews();
                    const gradeSelect = document.getElementById('gradeCalcCourseSelect');
                    if (gradeSelect?.value) renderGradeCalculatorV4();
                    improveGradeInputs();
                    hideAssignmentEstimate();
                }, 50);
                return result;
            };
        });
        scheduler.__gradeEngineV4 = true;
    }

    function patchTimeMethods() {
        const scheduler = app();
        if (!scheduler) return;
        scheduler.renderTimeStatistics = renderAllTimeViews;
        scheduler.renderTimeBreakdownByCourse = renderCourseTimeBreakdown;
    }

    function renderAllTimeViews() {
        renderTopTimeStats();
        renderCourseTimeBreakdown();
        renderWorkloadTracker();
    }

    function loadStyles() {
        if (document.querySelector('link[data-academic-insights-v4]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './academic-insights-v4.css';
        link.dataset.academicInsightsV4 = 'true';
        document.head.appendChild(link);
    }

    function init() {
        if (!app()) return setTimeout(init, 100);
        loadStyles();
        migrateAssignmentLogs();
        patchGradeEngine();
        patchTimeMethods();
        improveGradeInputs();
        hideAssignmentEstimate();
        renderAllTimeViews();
        const select = document.getElementById('gradeCalcCourseSelect');
        if (select && !select.dataset.v4GradeBound) {
            select.dataset.v4GradeBound = 'true';
            select.addEventListener('change', () => setTimeout(renderGradeCalculatorV4, 0));
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 80));
    else setTimeout(init, 80);
})();