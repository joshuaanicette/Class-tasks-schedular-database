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
