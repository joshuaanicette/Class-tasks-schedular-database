'use strict';

const { createHash } = require('node:crypto');
const defaults = {
  reminders7days: true,
  reminders3days: true,
  reminders1day: true,
  remindersDueToday: true,
  remindersOverdue: true,
  remindersHighPriority: true,
  lookaheadDays: 14,
};

function normalizePreferences(input = {}) {
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'boolean' && typeof input[key] === 'boolean') {
      result[key] = input[key];
    }
  }
  if ([7, 14, 21, 30].includes(input.lookaheadDays)) result.lookaheadDays = input.lookaheadDays;
  return result;
}

function localDay(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (name) => parts.find((p) => p.type === name).value;
  return Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day')));
}

function buildDigest(tasks, device, now = Date.now()) {
  const config = normalizePreferences(device.preferences);
  const zone = device.timeZone || 'UTC';
  const today = localDay(now, zone);
  const items = Object.values(tasks || {})
    .flatMap((task) => {
      if (!task || task.completed || task.submitted || Number(device.snoozes?.[task.id]) > now)
        return [];
      const due = Date.parse(task.dueDate);
      if (!Number.isFinite(due)) return [];
      const days = (localDay(due, zone) - today) / 86400000;
      let type;
      let label;
      let score;
      if (due < now) {
        if (!config.remindersOverdue) return [];
        type = 'overdue';
        label = 'Overdue';
        score = 0;
      } else if (days === 0 && config.remindersDueToday) {
        type = 'today';
        label = 'Due today';
        score = 10;
      } else if (days === 1 && config.reminders1day) {
        type = '1day';
        label = 'Due tomorrow';
        score = 20;
      } else if (days > 1 && days <= 3 && config.reminders3days) {
        type = '3days';
        label = `Due in ${days} days`;
        score = 30 + days;
      } else if (days > 3 && days <= 7 && config.reminders7days) {
        type = '7days';
        label = `Due in ${days} days`;
        score = 50 + days;
      } else if (
        task.priority === 'high' &&
        config.remindersHighPriority &&
        days > 0 &&
        days <= config.lookaheadDays
      ) {
        type = 'high';
        label = `High priority, due in ${days} days`;
        score = 70 + days;
      } else return [];
      return [{ task, due, days, type, label, score }];
    })
    .sort(
      (a, b) =>
        a.score - b.score || a.due - b.due || String(a.task.id).localeCompare(String(b.task.id)),
    );
  if (!items.length) return null;
  const first = items[0];
  const signature = JSON.stringify([today, items.map((x) => [x.task.id, x.type, x.due])]);
  return {
    key: createHash('sha256').update(signature).digest('hex'),
    body: `${String(first.task.title || 'Assignment').slice(0, 120)} — ${first.label}${items.length > 1 ? `. Plus ${items.length - 1} more reminder(s).` : '.'}`,
  };
}

module.exports = { normalizePreferences, localDay, buildDigest };
