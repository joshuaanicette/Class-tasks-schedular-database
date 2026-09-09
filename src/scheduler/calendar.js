// Calendar behavior, installed before the scheduler is constructed.
Object.assign(TaskSchedulerPro.prototype, {
  renderTodayAssignments() {
    const container = document.getElementById('todayAssignmentsList');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTasks = this.tasks
      .filter((task) => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime() && !task.completed;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (todayTasks.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No assignments due today! 🎉</p>';
      return;
    }

    container.innerHTML = todayTasks
      .map((task) => {
        const course = this.courses.find((c) => c.id === task.courseId);
        const courseColor = this.getCourseColor(task.courseId);
        const dueTime = new Date(task.dueDate).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });

        return `
                <div class="today-assignment-item" style="border-left-color: ${courseColor}"
                     onclick="taskScheduler.editTask(${task.id})">
                    <div class="today-assignment-header">
                        <div class="today-assignment-title">${task.title}</div>
                        <span class="today-assignment-course" style="background: ${courseColor}">
                            ${course ? course.code : 'N/A'}
                        </span>
                    </div>
                    <div class="today-assignment-time">
                        ⏰ Due at ${dueTime}
                        ${task.priority ? `<span class="priority-badge priority-${task.priority}" style="margin-left: 10px;">${task.priority.toUpperCase()}</span>` : ''}
                    </div>
                </div>
            `;
      })
      .join('');
  },

  renderCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    document.getElementById('calendarMonthYear').textContent = this.currentMonth.toLocaleDateString(
      'en-US',
      { month: 'long', year: 'numeric' },
    );

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach((day) => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      calendarGrid.appendChild(header);
    });

    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      calendarGrid.appendChild(emptyDay);
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      const dayEl = document.createElement('div');
      dayEl.className = `calendar-day ${isToday ? 'today' : ''}`;

      const dayNumber = document.createElement('div');
      dayNumber.className = 'calendar-day-number';
      dayNumber.textContent = day;
      dayEl.appendChild(dayNumber);

      const date = new Date(year, month, day);
      const dayTasks = this.tasks
        .filter((task) => {
          const taskDate = new Date(task.dueDate);
          return (
            taskDate.getDate() === day &&
            taskDate.getMonth() === month &&
            taskDate.getFullYear() === year &&
            !task.completed
          );
        })
        .slice(0, 3);

      dayTasks.forEach((task) => {
        const courseColor = this.getCourseColor(task.courseId);
        const taskEl = document.createElement('div');
        taskEl.className = `calendar-task ${task.priority}-priority`;
        taskEl.textContent = task.title;
        taskEl.title = `${task.title} - ${task.courseName}\nClick to edit`;
        taskEl.style.cursor = 'pointer';
        taskEl.style.background = courseColor;
        taskEl.onclick = (e) => {
          e.stopPropagation();
          this.editTask(task.id);
        };
        dayEl.appendChild(taskEl);
      });

      calendarGrid.appendChild(dayEl);
    }

    // Render today's assignments list
    this.renderTodayAssignments();
  },

  previousMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.renderCalendar();
    this.renderTodayAssignments();
  },

  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.renderCalendar();
    this.renderTodayAssignments();
  },

  todayMonth() {
    this.currentMonth = new Date();
    this.renderCalendar();
    this.renderTodayAssignments();
  },

  renderWeeklySchedule() {
    const container = document.getElementById('weeklyScheduleView');
    if (!container) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayMap = {
      Mon: 'Monday',
      Tue: 'Tuesday',
      Wed: 'Wednesday',
      Thu: 'Thursday',
      Fri: 'Friday',
      Sat: 'Saturday',
      Sun: 'Sunday',
    };

    let scheduleByDay = {};
    days.forEach((day) => (scheduleByDay[day] = []));

    // Collect all courses with meeting times
    this.courses.forEach((course) => {
      if (course.meetingDays && course.meetingDays.length > 0 && course.meetingTime) {
        course.meetingDays.forEach((dayShort) => {
          const day = dayMap[dayShort];
          if (day) {
            scheduleByDay[day].push({
              course: course,
              time: course.meetingTime,
            });
          }
        });
      }
    });

    let html =
      '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">';

    days.forEach((day) => {
      html += `
                <div style="background: var(--card-bg); padding: 15px; border-radius: 10px; border: 1px solid var(--border-color);">
                    <h4 style="margin-bottom: 15px; color: var(--accent);">${day}</h4>
            `;

      if (scheduleByDay[day].length === 0) {
        html += '<p style="color: var(--text-secondary); font-size: 0.9em;">No classes</p>';
      } else {
        scheduleByDay[day].sort((a, b) => a.time.localeCompare(b.time));
        scheduleByDay[day].forEach((item) => {
          html += `
                        <div style="margin: 10px 0; padding: 10px; background: var(--hover-bg); border-radius: 8px;">
                            <div style="font-weight: 600;">${item.course.code}</div>
                            <div style="font-size: 0.9em; color: var(--text-secondary);">${item.time}</div>
                            ${item.course.instructor ? `<div style="font-size: 0.85em; color: var(--text-secondary);">${item.course.instructor}</div>` : ''}
                        </div>
                    `;
        });
      }

      html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
  },
});
