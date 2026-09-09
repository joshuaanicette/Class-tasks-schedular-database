// Helper: Format date for ICS (YYYYMMDDTHHMMSSZ)
function formatICSDate(date) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Helper: Format date for ICS (YYYYMMDD for all-day events)
function formatICSDateOnly(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Helper: Escape text for ICS format
function escapeICS(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Helper: Get day of week number (0=Sunday, 1=Monday, etc.)
function getDayNumber(dayCode) {
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return days[dayCode] || 0;
}

// Helper: Convert meeting time to start/end times
function parseMeetingTime(timeString) {
  // Parse "10:00 AM - 11:30 AM" format
  if (!timeString) return null;

  const match = timeString.match(/(\d+):(\d+)\s*(AM|PM)\s*-\s*(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;

  let startHour = parseInt(match[1]);
  const startMin = match[2];
  const startPeriod = match[3].toUpperCase();

  let endHour = parseInt(match[4]);
  const endMin = match[5];
  const endPeriod = match[6].toUpperCase();

  // Convert to 24-hour format
  if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
  if (startPeriod === 'AM' && startHour === 12) startHour = 0;
  if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
  if (endPeriod === 'AM' && endHour === 12) endHour = 0;

  return {
    startHour: String(startHour).padStart(2, '0'),
    startMin: startMin,
    endHour: String(endHour).padStart(2, '0'),
    endMin: endMin,
  };
}

// Generate complete ICS file content
function generateICSContent() {
  const tasks = taskScheduler.tasks;
  const courses = taskScheduler.courses;

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Task Scheduler Pro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Task Scheduler',
    'X-WR-TIMEZONE:America/New_York',
    'X-WR-CALDESC:Assignments and class schedule from Task Scheduler Pro',
  ];

  // Add all assignments as VTODO (tasks) or VEVENT (events)
  tasks.forEach((task) => {
    const course = courses.find((c) => c.id === task.courseId);
    const courseName = course ? course.code : 'Unknown';

    // Create unique ID
    const uid = `task-${task.id}@taskscheduler.app`;
    const now = formatICSDate(new Date());
    const dueDate = formatICSDateOnly(task.dueDate);

    // Use VTODO for assignments
    icsContent.push('BEGIN:VTODO');
    icsContent.push(`UID:${uid}`);
    icsContent.push(`DTSTAMP:${now}`);
    icsContent.push(`CREATED:${formatICSDate(task.createdAt || new Date())}`);
    icsContent.push(`LAST-MODIFIED:${formatICSDate(task.updatedAt || new Date())}`);
    icsContent.push(`SUMMARY:${escapeICS(courseName + ': ' + task.title)}`);
    icsContent.push(`DUE;VALUE=DATE:${dueDate}`);

    if (task.description) {
      icsContent.push(`DESCRIPTION:${escapeICS(task.description)}`);
    }

    // Priority: HIGH=1, MEDIUM=5, LOW=9
    const priorityMap = { high: 1, medium: 5, low: 9 };
    icsContent.push(`PRIORITY:${priorityMap[task.priority] || 5}`);

    // Status
    if (task.completed) {
      icsContent.push('STATUS:COMPLETED');
      if (task.completedAt) {
        icsContent.push(`COMPLETED:${formatICSDate(task.completedAt)}`);
      }
      icsContent.push('PERCENT-COMPLETE:100');
    } else {
      icsContent.push('STATUS:NEEDS-ACTION');
      icsContent.push('PERCENT-COMPLETE:0');
    }

    // Categories/tags
    if (task.tags && task.tags.length > 0) {
      icsContent.push(`CATEGORIES:${task.tags.join(',')}`);
    }

    icsContent.push('END:VTODO');
  });

  // Add recurring class meetings as VEVENT
  courses.forEach((course) => {
    if (!course.meetingDays || course.meetingDays.length === 0 || !course.meetingTime) {
      return; // Skip courses without meeting times
    }

    const times = parseMeetingTime(course.meetingTime);
    if (!times) return;

    // Create event for each meeting day
    course.meetingDays.forEach((dayCode) => {
      const uid = `class-${course.id}-${dayCode}@taskscheduler.app`;
      const now = formatICSDate(new Date());

      // Find next occurrence of this day
      const today = new Date();
      const targetDay = getDayNumber(dayCode);
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7;

      const nextOccurrence = new Date(today);
      nextOccurrence.setDate(today.getDate() + daysUntil);
      nextOccurrence.setHours(parseInt(times.startHour), parseInt(times.startMin), 0, 0);

      const endTime = new Date(nextOccurrence);
      endTime.setHours(parseInt(times.endHour), parseInt(times.endMin), 0, 0);

      // Format dates in local timezone
      const dtStart = formatICSDate(nextOccurrence);
      const dtEnd = formatICSDate(endTime);

      // Day abbreviations for RRULE
      const dayAbbrev = {
        Sun: 'SU',
        Mon: 'MO',
        Tue: 'TU',
        Wed: 'WE',
        Thu: 'TH',
        Fri: 'FR',
        Sat: 'SA',
      };

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${now}`);
      icsContent.push(`DTSTART:${dtStart}`);
      icsContent.push(`DTEND:${dtEnd}`);
      icsContent.push(`SUMMARY:${escapeICS(course.code + ' - ' + course.name)}`);

      if (course.instructor) {
        icsContent.push(`DESCRIPTION:Instructor: ${escapeICS(course.instructor)}`);
      }

      // Recurring weekly for ~16 weeks (typical semester)
      const untilDate = new Date(nextOccurrence);
      untilDate.setDate(untilDate.getDate() + 16 * 7);
      icsContent.push(
        `RRULE:FREQ=WEEKLY;BYDAY=${dayAbbrev[dayCode]};UNTIL=${formatICSDate(untilDate)}`,
      );

      icsContent.push(`LOCATION:${escapeICS(course.semester || 'Campus')}`);
      icsContent.push(`CATEGORIES:Class,${escapeICS(course.code)}`);
      icsContent.push('END:VEVENT');
    });
  });

  icsContent.push('END:VCALENDAR');

  return icsContent.join('\r\n');
}

// Export to Google Calendar
function exportToGoogleCalendar() {
  // Generate ICS content
  const icsContent = generateICSContent();

  // Create blob and download
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'task-scheduler.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // ⭐ Open Google Calendar import page in new tab
  setTimeout(() => {
    window.open('https://calendar.google.com/calendar/u/0/r/settings/export', '_blank');
  }, 500);

  // ⭐ Show instructions
  setTimeout(() => {
    alert(
      '✅ File downloaded & Google Calendar opened!\n\n📋 Next steps:\n\n1. In the Google Calendar tab that just opened:\n2. Click "Import & Export" (left sidebar)\n3. Click "Select file from your computer"\n4. Choose: task-scheduler.ics (just downloaded)\n5. Click "Import"\n\n✅ Done!',
    );
  }, 1000);
}

// Export to Outlook
function exportToOutlook() {
  // Generate ICS content
  const icsContent = generateICSContent();

  // Create blob and download
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'task-scheduler.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // ⭐ Open Outlook Calendar in new tab
  setTimeout(() => {
    window.open('https://outlook.live.com/calendar/0/view/month', '_blank');
  }, 500);

  // ⭐ Show instructions
  setTimeout(() => {
    alert(
      '✅ File downloaded & Outlook Calendar opened!\n\n📋 Next steps:\n\n1. In the Outlook Calendar tab that just opened:\n2. Click "Add calendar" (top toolbar)\n3. Click "Upload from file"\n4. Choose: task-scheduler.ics (just downloaded)\n5. Click "Import"\n\n✅ Done!\n\n💻 For Outlook Desktop App:\nFile → Open & Export → Import/Export → Import .ics file',
    );
  }, 1000);
}

// Export to ICS (universal format)
function exportToICS() {
  // Generate ICS content
  const icsContent = generateICSContent();

  // Create blob and download
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'task-scheduler-' + new Date().toISOString().split('T')[0] + '.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  taskScheduler.showNotification('✅ Calendar exported! (.ics file downloaded)', 'success');

  // Show what's included
  const taskCount = taskScheduler.tasks.length;
  const classCount = taskScheduler.courses.filter(
    (c) => c.meetingDays && c.meetingDays.length > 0,
  ).length;

  setTimeout(() => {
    alert(
      `📅 Calendar exported successfully!\n\n✅ ${taskCount} assignments (as tasks)\n✅ ${classCount} recurring class meetings\n\nThis .ics file works with:\n• Google Calendar\n• Outlook\n• Apple Calendar\n• Any calendar app!\n\nJust import the file into your calendar app.`,
    );
  }, 500);
}
