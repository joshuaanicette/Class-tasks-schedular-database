const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');

function boot(t, stored = {}) {
  const html = fs.readFileSync('index.html', 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://scheduler.test',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  t.after(() => dom.window.close());
  const window = dom.window;
  window.confirm = () => true;
  window.alert = () => {};
  for (const [key, value] of Object.entries(stored)) window.localStorage.setItem(key, value);
  for (const script of window.document.querySelectorAll('script[src^="./"]')) {
    const path = script.getAttribute('src');
    new vm.Script(fs.readFileSync(path, 'utf8'), { filename: path }).runInContext(
      dom.getInternalVMContext(),
    );
  }
  const app = vm.runInContext('taskScheduler', dom.getInternalVMContext());
  return { window, app, context: dom.getInternalVMContext() };
}

const course = {
  id: 1,
  name: 'Circuit Analysis',
  code: 'ECE 201',
  semester: 'Fall Quarter 2026',
  credits: 4,
  gradeCategories: [],
  meetingDays: ['Mon'],
  meetingTime: '10:00',
  createdAt: '2026-09-01T12:00:00Z',
};
const task = {
  id: 2,
  courseId: 1,
  courseName: 'Circuit Analysis',
  title: 'Circuit worksheet',
  type: 'homework',
  dueDate: '2026-09-25T12:00:00Z',
  createdAt: '2026-09-01T12:00:00Z',
  priority: 'high',
  completed: false,
  tags: [],
  attachments: [],
};
const saved = {
  taskSchedulerCourses: JSON.stringify([course]),
  taskSchedulerTasks: JSON.stringify([task]),
};

test('summary blocks share the header gradient and use fully opaque white text', (t) => {
  const css = fs.readFileSync('assets/css/polish.css', 'utf8');
  const dom = new JSDOM(`<style>${css}</style>`);
  t.after(() => dom.window.close());
  const rules = [...dom.window.document.styleSheets[0].cssRules];
  const styleFor = (selector) =>
    rules.filter((rule) => rule.selectorText === selector).at(-1).style;
  assert.equal(styleFor('.header').getPropertyValue('background'), 'var(--header-gradient)');
  assert.equal(styleFor('.stat-item').getPropertyValue('background'), 'var(--header-gradient)');
  const textRule = rules.find((rule) => rule.selectorText?.includes('.stat-item .stat-number'));
  assert.equal(textRule.style.getPropertyValue('color'), 'var(--header-text)');
  assert.equal(textRule.style.getPropertyValue('opacity'), '1');
  assert.equal(styleFor(':root').getPropertyValue('--header-text'), '#ffffff');
});

test('complete app starts with all features when external SDKs are unavailable', (t) => {
  const { app, window } = boot(t);
  assert.equal(app.courses.length, 0);
  assert.equal(app.tasks.length, 0);
  for (const flag of [
    '__courseComponentsV5',
    '__weekdayUnifiedScheduleV6',
    '__assessmentWeeklyV7',
    '__assessmentCalendarV8',
    '__syllabusKeywordV10',
  ]) {
    assert.equal(app[flag], true, flag);
  }
  assert.equal(window.schedulerPalettes.length, 21);
  assert.equal(window.document.querySelectorAll('[role="tab"]').length, 8);
  window.SchedulerFeatures.start();
  assert.equal(window.document.querySelectorAll('#v5CourseComponents').length <= 1, true);
});

test('existing data restores task dates and renders courses, assignments, and calendar', (t) => {
  const { app, window } = boot(t, saved);
  assert.equal(app.tasks[0].dueDate.toISOString(), task.dueDate.replace('Z', '.000Z'));
  assert.match(window.document.querySelector('#coursesGrid').textContent, /Circuit Analysis/);
  assert.match(window.document.querySelector('#taskList').textContent, /Circuit worksheet/);
  assert.doesNotThrow(() => app.renderCalendar());
  app.completeTask(2);
  assert.equal(app.tasks[0].completed, true);
  assert.equal(JSON.parse(window.localStorage.getItem('taskSchedulerTasks'))[0].completed, true);
});

test('course and assignment forms still create and persist records', (t) => {
  const { app, window } = boot(t);
  const set = (id, value) => (window.document.getElementById(id).value = value);
  set('courseName', 'Computer Engineering');
  set('courseCode', 'ECE 105');
  set('credits', '4');
  app.addCourse();
  assert.equal(app.courses.length, 1);
  set('courseSelect', String(app.courses[0].id));
  set('taskTitle', 'Logic worksheet');
  set('assignmentType', 'homework');
  set('dueDate', '2026-10-01T18:00');
  app.addTask();
  assert.equal(app.tasks.length, 1);
  assert.equal(
    JSON.parse(window.localStorage.getItem('taskSchedulerTasks'))[0].title,
    'Logic worksheet',
  );
});

test('tab switching updates accessible selection', (t) => {
  const { window } = boot(t);
  const tab = window.document.getElementById('tab-assignments');
  window.openTab({ currentTarget: tab }, 'assignments');
  assert.equal(tab.getAttribute('aria-selected'), 'true');
  assert.equal(tab.tabIndex, 0);
  assert.equal(window.document.querySelectorAll('[aria-selected="true"]').length, 1);
  assert.equal(window.document.querySelector('.tab-content.active').id, 'assignments');
});

test('calendar-day reminders distinguish today, tomorrow, and DST transitions', (t) => {
  const { window } = boot(t);
  const { calendarDaysUntil } = window.SchedulerUtils;
  assert.equal(calendarDaysUntil(new Date(2026, 8, 9, 23), new Date(2026, 8, 9, 8)), 0);
  assert.equal(calendarDaysUntil(new Date(2026, 8, 10, 1), new Date(2026, 8, 9, 23)), 1);
  assert.equal(calendarDaysUntil(new Date(2026, 2, 9, 8), new Date(2026, 2, 8, 8)), 1);
  assert.equal(calendarDaysUntil(new Date(2026, 8, 8, 23), new Date(2026, 8, 9, 8)), -1);
});

test('malformed local storage cannot crash startup', (t) => {
  const { app } = boot(t, {
    taskSchedulerCourses: '{}',
    taskSchedulerTasks: 'not json',
    taskSchedulerArchives: 'null',
  });
  assert.equal(app.courses.length + app.tasks.length + app.archives.length, 0);
});

test('backup import hydrates dates and rejects malformed collections before changing data', (t) => {
  const { app, window } = boot(t, saved);
  let payload;
  window.FileReader = class {
    readAsText() {
      this.onload({ target: { result: JSON.stringify(payload) } });
    }
  };
  const create = window.document.createElement.bind(window.document);
  window.document.createElement = function (tag) {
    const element = create(tag);
    if (tag === 'input') element.click = () => element.onchange({ target: { files: [{}] } });
    return element;
  };
  payload = { courses: [course], tasks: [{ ...task, id: 3 }], archives: [] };
  app.importData();
  assert.equal(app.tasks[0].id, 3);
  assert.equal(typeof app.tasks[0].dueDate.toISOString, 'function');
  payload = { courses: {}, tasks: [], archives: [] };
  app.importData();
  assert.equal(app.tasks[0].id, 3);
});

test('all palette cards update theme colors, selection, and storage through real click handlers', (t) => {
  const { window } = boot(t);
  const { document } = window;
  const button = document.querySelector('.theme-selector .icon-btn');
  const menu = document.getElementById('themeMenu');
  for (const palette of window.schedulerPalettes) {
    button.click();
    assert.equal(menu.classList.contains('show'), true);
    const card = menu.querySelector(`[data-v9-palette="${palette.id}"]`);
    card.querySelector('strong').click();
    assert.equal(document.body.dataset.palette, palette.id);
    assert.equal(document.documentElement.style.getPropertyValue('--header-text'), '#ffffff');
    assert.equal(window.localStorage.getItem('selectedTheme'), palette.id);
    assert.equal(document.documentElement.style.colorScheme, palette.mode.toLowerCase());
    assert.equal(menu.querySelectorAll('[aria-pressed="true"]').length, 1);
    assert.equal(card.getAttribute('aria-pressed'), 'true');
    assert.equal(menu.classList.contains('show'), false);
    for (const property of [
      '--primary-bg',
      '--secondary-bg',
      '--accent',
      '--accent-light',
      '--card-bg',
      '--text-primary',
      '--text-secondary',
      '--border-color',
      '--hover-bg',
    ]) {
      const value = document.documentElement.style.getPropertyValue(property);
      assert.match(value, /^#[\da-f]{6}$/i);
      assert.equal(document.body.style.getPropertyValue(property), value);
    }
  }
  window.changeTheme('default');
  assert.equal(document.documentElement.style.getPropertyValue('--accent'), '#00d2ff');
  assert.equal(document.documentElement.style.getPropertyValue('--card-bg'), '#ffffff');
  assert.equal(document.documentElement.style.getPropertyValue('--header-text'), '#ffffff');
  window.changeTheme('arctic-theme');
  assert.equal(document.documentElement.style.getPropertyValue('--header-text'), '#ffffff');
});

test('saved dark palette restores, and blocked storage does not prevent changing colors', (t) => {
  const { window } = boot(t, { selectedTheme: 'cobalt-theme' });
  assert.equal(window.document.body.dataset.palette, 'cobalt-theme');
  assert.equal(window.document.documentElement.style.getPropertyValue('--card-bg'), '#111827');
  assert.equal(window.document.documentElement.style.colorScheme, 'dark');
  window.Storage.prototype.setItem = () => {
    throw new Error('Storage unavailable');
  };
  assert.doesNotThrow(() => window.changeTheme('default'));
  assert.equal(window.document.body.dataset.palette, 'default');
  assert.equal(window.document.documentElement.style.colorScheme, 'light');
});

test('palette menu supports close, Escape, outside click, focus return, and mobile scroll unlock', (t) => {
  const { window } = boot(t);
  Object.defineProperty(window, 'innerWidth', { value: 390 });
  const { document } = window;
  const button = document.querySelector('.theme-selector .icon-btn');
  const menu = document.getElementById('themeMenu');
  for (const close of [
    () => menu.querySelector('.v9-palette-close').click(),
    () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })),
    () => document.body.click(),
  ]) {
    button.click();
    assert.equal(document.body.classList.contains('v9-palette-open'), true);
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(document.activeElement, menu.querySelector('.v9-palette-close'));
    close();
    assert.equal(menu.classList.contains('show'), false);
    assert.equal(document.body.classList.contains('v9-palette-open'), false);
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(document.activeElement, button);
  }
});

test('editing a past completed assignment submits without changing its deadline or completion', (t) => {
  const original = {
    ...task,
    dueDate: '2020-01-01T17:15:32.456Z',
    completed: true,
    completedAt: '2020-01-02T12:00:00Z',
  };
  const { app, window } = boot(t, { ...saved, taskSchedulerTasks: JSON.stringify([original]) });
  const { document } = window;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  app.editTask(task.id);
  assert.equal(document.getElementById('dueDate').hasAttribute('min'), false);
  assert.equal(document.getElementById('taskForm').checkValidity(), true);
  document.getElementById('assignmentGrade').value = '98';
  document.querySelector('#taskForm button[type="submit"]').click();
  const storedTask = JSON.parse(window.localStorage.getItem('taskSchedulerTasks'))[0];
  assert.equal(storedTask.dueDate, original.dueDate);
  assert.equal(storedTask.completed, true);
  assert.equal(storedTask.completedAt, original.completedAt);
  assert.equal(storedTask.grade, '98');
  assert.ok(document.getElementById('dueDate').min);
  assert.equal(app.editingTaskId, null);
});

test('editing an overdue pending assignment accepts an explicitly changed past date', (t) => {
  const { app, window } = boot(t, saved);
  window.HTMLElement.prototype.scrollIntoView = () => {};
  app.editTask(task.id);
  window.document.getElementById('dueDate').value = '2020-02-02T09:30';
  window.document.querySelector('#taskForm button[type="submit"]').click();
  assert.equal(app.tasks[0].dueDate.getTime(), new Date('2020-02-02T09:30').getTime());
  assert.equal(app.tasks[0].completed, false);
});

test('class hubs combine with grouping, status filters and search without changing saved data', (t) => {
  const otherCourse = { ...course, id: 10, name: 'Software Design', code: 'SE 211' };
  const tasks = [
    { ...task, id: 2, title: 'Circuit homework', priority: 'low' },
    { ...task, id: 3, title: 'Circuit lab', type: 'lab', priority: 'high' },
    { ...task, id: 4, title: 'Finished circuit', completed: true },
    {
      ...task,
      id: 5,
      title: 'Software project',
      courseId: 10,
      courseName: otherCourse.name,
      type: 'project',
    },
  ];
  const stored = {
    taskSchedulerCourses: JSON.stringify([course, otherCourse]),
    taskSchedulerTasks: JSON.stringify(tasks),
  };
  const { app, window } = boot(t, stored);
  const { document } = window;
  const list = () => document.getElementById('taskList');
  const group = (value) => {
    document.getElementById('assignmentGrouping').value = value;
    document.getElementById('assignmentGrouping').dispatchEvent(new window.Event('change'));
  };
  assert.equal(document.querySelectorAll('.class-hub').length, 3);
  document.querySelector('.class-hub[data-course-id="1"]').click();
  assert.match(
    document.querySelector('.class-hub[aria-pressed="true"]').textContent,
    /2 pending.*1 completed/,
  );
  assert.equal(list().querySelectorAll('.task-item').length, 3);
  assert.doesNotMatch(list().textContent, /Software project/);
  group('priority');
  assert.deepEqual(
    [...list().querySelectorAll('.assignment-group-title')].map((el) => el.textContent.trim()),
    ['High priority 1', 'Low priority 1', 'Completed 1'],
  );
  group('type');
  assert.match(list().textContent, /Homework/);
  assert.match(list().textContent, /Lab/);
  document.querySelector('[data-filter="completed"]').click();
  assert.equal(list().querySelectorAll('.task-item').length, 1);
  document.querySelector('[data-filter="all"]').click();
  const search = document.getElementById('globalSearch');
  search.value = 'lab';
  search.dispatchEvent(new window.Event('input'));
  assert.equal(list().querySelectorAll('.task-item').length, 1);
  assert.match(list().textContent, /Circuit lab/);
  document.getElementById('clearSearch').click();
  document.querySelector('.class-hub[data-course-id="all"]').click();
  group('none');
  assert.equal(list().querySelectorAll('.task-item').length, 4);
  assert.equal(list().querySelectorAll('.assignment-group').length, 0);
  assert.equal(window.localStorage.getItem('taskSchedulerTasks'), stored.taskSchedulerTasks);
  assert.equal(window.localStorage.getItem('taskSchedulerCourses'), stored.taskSchedulerCourses);
  app.assignmentCourseId = 10;
  app.deleteCourse(10);
  assert.equal(app.assignmentCourseId, null);
  assert.match(document.getElementById('assignmentScope').textContent, /All classes/);
});

test('date groups use local calendar days and keep completed work separate', (t) => {
  const today = new Date();
  today.setHours(23, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tasks = [
    { ...task, id: 2, dueDate: today.toISOString() },
    { ...task, id: 3, dueDate: tomorrow.toISOString() },
    { ...task, id: 4, completed: true },
  ];
  const { window } = boot(t, { ...saved, taskSchedulerTasks: JSON.stringify(tasks) });
  assert.deepEqual(
    [...window.document.querySelectorAll('.assignment-group-title')].map((el) =>
      el.textContent.trim(),
    ),
    ['Today 1', 'Tomorrow 1', 'Completed 1'],
  );
});
