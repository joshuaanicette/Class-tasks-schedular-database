window.SchedulerUtils = Object.freeze({
  escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character],
    );
  },
  calendarDaysUntil(date, now = new Date()) {
    // Compare calendar dates rather than 24-hour windows, including across DST.
    const day = (value) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    return Math.round((day(new Date(date)) - day(new Date(now))) / 86400000);
  },
  readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  },
  restoreTasks(tasks) {
    return tasks.map((task) => ({
      ...task,
      dueDate: new Date(task.dueDate),
      createdAt: new Date(task.createdAt),
    }));
  },
});

// Existing renderers call this function; keep that contract during extraction.
function sanitizeInput(value) {
  return window.SchedulerUtils.escapeHtml(value);
}
