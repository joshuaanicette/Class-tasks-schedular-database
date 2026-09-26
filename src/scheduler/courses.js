// Courses behavior, installed before the scheduler is constructed.
Object.assign(TaskSchedulerPro.prototype, {
  addCategoryRow() {
    const id = Date.now();
    this.tempCategories.push({ id, name: '', weight: 0 });
    this.renderCategories();
  },

  addEditCategoryRow() {
    const id = Date.now();
    this.tempEditCategories.push({ id, name: '', weight: 0 });
    this.renderEditCategories();
  },

  renderCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = this.tempCategories
      .map(
        (cat, index) => `
            <div class="category-row">
                <input type="text" placeholder="Category name (e.g., Exams)"
                       value="${cat.name}"
                       onchange="taskScheduler.updateCategory(${index}, 'name', this.value)">
                <input type="number" placeholder="Weight %" min="0" max="100"
                       value="${cat.weight || ''}"
                       onchange="taskScheduler.updateCategory(${index}, 'weight', this.value)">
                <button type="button" onclick="taskScheduler.removeCategory(${index})">Remove</button>
            </div>
        `,
      )
      .join('');

    const totalWeight = this.tempCategories.reduce(
      (sum, cat) => sum + (parseFloat(cat.weight) || 0),
      0,
    );
    if (totalWeight > 0 && totalWeight !== 100) {
      container.innerHTML += `<p style="color: var(--warning); margin-top: 10px;">⚠️ Total weight: ${totalWeight}% (should be 100%)</p>`;
    } else if (totalWeight === 100) {
      container.innerHTML += `<p style="color: var(--success); margin-top: 10px;">✓ Total weight: 100%</p>`;
    }
  },

  renderEditCategories() {
    const container = document.getElementById('editCategoriesList');
    container.innerHTML = this.tempEditCategories
      .map(
        (cat, index) => `
            <div class="category-row">
                <input type="text" placeholder="Category name"
                       value="${cat.name}"
                       onchange="taskScheduler.updateEditCategory(${index}, 'name', this.value)">
                <input type="number" placeholder="Weight %" min="0" max="100"
                       value="${cat.weight || ''}"
                       onchange="taskScheduler.updateEditCategory(${index}, 'weight', this.value)">
                <button type="button" onclick="taskScheduler.removeEditCategory(${index})">Remove</button>
            </div>
        `,
      )
      .join('');
  },

  updateCategory(index, field, value) {
    if (field === 'weight') {
      this.tempCategories[index][field] = parseFloat(value) || 0;
    } else {
      this.tempCategories[index][field] = value;
    }
    this.renderCategories();
  },

  updateEditCategory(index, field, value) {
    if (field === 'weight') {
      this.tempEditCategories[index][field] = parseFloat(value) || 0;
    } else {
      this.tempEditCategories[index][field] = value;
    }
    this.renderEditCategories();
  },

  removeCategory(index) {
    this.tempCategories.splice(index, 1);
    this.renderCategories();
  },

  removeEditCategory(index) {
    this.tempEditCategories.splice(index, 1);
    this.renderEditCategories();
  },

  addCourse() {
    const name = sanitizeInput(document.getElementById('courseName').value.trim());
    const code = sanitizeInput(document.getElementById('courseCode').value.trim());
    const instructor = sanitizeInput(document.getElementById('instructor').value.trim());
    const semester = document.getElementById('semester').value;
    const description = sanitizeInput(document.getElementById('courseDescription').value.trim());
    const meetingDays = Array.from(document.getElementById('meetingDays').selectedOptions).map(
      (opt) => opt.value,
    );
    const meetingTime = document.getElementById('meetingTime').value;
    const targetGrade = document.getElementById('targetGrade').value;
    const credits = parseFloat(document.getElementById('credits').value) || 0;

    if (!name || !code) {
      this.showNotification('Course name and code required.', 'error');
      return;
    }

    // Validate categories total to 100%
    const totalWeight = this.tempCategories.reduce(
      (sum, cat) => sum + (parseFloat(cat.weight) || 0),
      0,
    );
    if (this.tempCategories.length > 0 && Math.abs(totalWeight - 100) > 0.01) {
      if (!confirm(`Grade categories total ${totalWeight}%. Continue anyway?`)) {
        return;
      }
    }

    const course = {
      id: Date.now(),
      name,
      code,
      instructor,
      semester,
      description,
      meetingDays,
      meetingTime: meetingTime || null,
      targetGrade,
      credits,
      gradeCategories: this.tempCategories.filter((c) => c.name && c.weight > 0),
      syllabus: this.syllabusText || null,
      createdAt: new Date(),
    };

    this.courses.push(course);
    this.saveCourses();
    this.renderCourses();
    this.renderTasks();
    this.updateCourseSelect();
    this.updateGradeCalcCourseSelect();
    this.updateWhatIfCourseSelect();
    this.clearCourseForm();
    this.renderProgress();
    this.renderWeeklySchedule();
    this.showNotification('Course added!', 'success');
  },

  clearCourseForm() {
    document.getElementById('courseForm').reset();
    this.tempCategories = [];
    this.syllabusText = '';
    this.extractedDates = [];
    this.renderCategories();
    document.getElementById('syllabusUpload').classList.remove('has-file');
    document.getElementById('syllabusUpload').innerHTML = '<p>📎 Click to upload syllabus PDF</p>';

    // Always reset to add mode
    const addButton = document.querySelector('#courses .add-btn');
    if (addButton) {
      addButton.textContent = '➕ Add Course';
    }
    this.editingCourseId = null;
  },

  renderCourses() {
    this.renderClassHubs();
    const coursesGrid = document.getElementById('coursesGrid');
    let filteredCourses = this.courses;

    if (this.searchTerm) {
      filteredCourses = this.courses.filter(
        (course) =>
          course.name.toLowerCase().includes(this.searchTerm) ||
          course.code.toLowerCase().includes(this.searchTerm) ||
          (course.instructor && course.instructor.toLowerCase().includes(this.searchTerm)),
      );
    }

    if (filteredCourses.length === 0) {
      coursesGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No courses found</h3>
                    <p>Add your first course to get started!</p>
                </div>
            `;
      return;
    }

    coursesGrid.innerHTML = filteredCourses.map((course) => this.createCourseHTML(course)).join('');
  },

  createCourseHTML(course) {
    const courseTasks = this.tasks.filter((t) => t.courseId === course.id);
    const totalTasks = courseTasks.length;
    const completedTasks = courseTasks.filter((t) => t.completed).length;
    const overdueTasks = courseTasks.filter(
      (t) => !t.completed && new Date(t.dueDate) < new Date(),
    ).length;

    const currentGrade = this.calculateCourseGrade(course.id);
    const gradeDisplay = currentGrade ? `<div class="course-grade">${currentGrade}</div>` : '';

    const syllabusIndicator = course.syllabus
      ? '<span class="syllabus-indicator">📄 Syllabus uploaded</span>'
      : '';

    const categoriesHTML =
      course.gradeCategories && course.gradeCategories.length > 0
        ? `
            <div class="grade-categories">
                <strong>Grade Breakdown:</strong>
                ${course.gradeCategories
                  .map(
                    (cat) => `
                    <div class="category-item">
                        <span>${cat.name}</span>
                        <span>${cat.weight}%</span>
                    </div>
                `,
                  )
                  .join('')}
            </div>
        `
        : '';

    return `
            <div class="course-card">
                <div class="course-header">
                    <div>
                        <div class="course-name">${course.name}</div>
                        <div class="course-code">${course.code} • ${course.semester}</div>
                        ${course.instructor ? `<div class="course-code">👨‍🏫 ${course.instructor}</div>` : ''}
                        ${syllabusIndicator}
                    </div>
                    <div class="course-actions">
                        <button class="course-btn edit-course-btn" onclick="taskScheduler.editCourse(${course.id})">✏️</button>
                        <button class="course-btn delete-course-btn" onclick="taskScheduler.deleteCourse(${course.id})">🗑️</button>
                    </div>
                </div>
                ${gradeDisplay}
                ${categoriesHTML}
                <div class="course-stats">
                    <div class="course-stat">
                        <div class="course-stat-number">${totalTasks}</div>
                        <div class="course-stat-label">Total</div>
                    </div>
                    <div class="course-stat">
                        <div class="course-stat-number">${totalTasks - completedTasks}</div>
                        <div class="course-stat-label">Pending</div>
                    </div>
                    <div class="course-stat">
                        <div class="course-stat-number">${overdueTasks}</div>
                        <div class="course-stat-label">Overdue</div>
                    </div>
                </div>
            </div>
        `;
  },

  editCourse(courseId) {
    const course = this.courses.find((c) => c.id === courseId);
    if (!course) return;

    // Populate form fields
    document.getElementById('courseName').value = course.name;
    document.getElementById('courseCode').value = course.code;
    document.getElementById('instructor').value = course.instructor || '';
    document.getElementById('semester').value = course.semester || '';
    document.getElementById('courseDescription').value = course.description || '';
    document.getElementById('credits').value = course.credits || '';
    document.getElementById('targetGrade').value = course.targetGrade || '';
    document.getElementById('meetingTime').value = course.meetingTime || '';

    // Set meeting days
    if (course.meetingDays && course.meetingDays.length > 0) {
      const meetingDaysSelect = document.getElementById('meetingDays');
      Array.from(meetingDaysSelect.options).forEach((option) => {
        option.selected = course.meetingDays.includes(option.value);
      });
    }

    // Set categories
    this.tempCategories = course.gradeCategories ? [...course.gradeCategories] : [];
    this.renderCategories();

    // Store the ID for updating
    this.editingCourseId = courseId;

    // Change button text
    const addButton = document.querySelector('#courses .add-btn');
    if (addButton) {
      addButton.textContent = '💾 Update Course';
    }

    // Scroll to form
    document.querySelector('#courses .form-section').scrollIntoView({ behavior: 'smooth' });

    this.showNotification('Editing course - update when ready', 'info');
  },

  updateCourse() {
    if (!this.editingCourseId) return;

    const name = sanitizeInput(document.getElementById('courseName').value.trim());
    const code = sanitizeInput(document.getElementById('courseCode').value.trim());
    const instructor = sanitizeInput(document.getElementById('instructor').value.trim());
    const semester = document.getElementById('semester').value;
    const description = sanitizeInput(document.getElementById('courseDescription').value.trim());
    const meetingDays = Array.from(document.getElementById('meetingDays').selectedOptions).map(
      (opt) => opt.value,
    );
    const meetingTime = document.getElementById('meetingTime').value;
    const targetGrade = document.getElementById('targetGrade').value;
    const credits = parseFloat(document.getElementById('credits').value) || 0;

    if (!name || !code) {
      this.showNotification('Course name and code required.', 'error');
      return;
    }

    // Find and update the course
    const courseIndex = this.courses.findIndex((c) => c.id === this.editingCourseId);
    if (courseIndex !== -1) {
      this.courses[courseIndex] = {
        ...this.courses[courseIndex],
        name,
        code,
        instructor,
        semester,
        description,
        meetingDays,
        meetingTime: meetingTime || null,
        targetGrade,
        credits,
        gradeCategories: this.tempCategories.filter((c) => c.name && c.weight > 0),
      };

      this.saveCourses();
      this.renderCourses();
      this.updateCourseSelect();
      this.updateGradeCalcCourseSelect();
      this.updateWhatIfCourseSelect();
      this.clearCourseForm();
      this.renderProgress();
      this.renderWeeklySchedule();

      // Reset button
      const addButton = document.querySelector('#courses .add-btn');
      if (addButton) {
        addButton.textContent = '➕ Add Course';
      }
      this.editingCourseId = null;

      this.showNotification('Course updated!', 'success');
    }
  },

  deleteCourse(courseId) {
    if (!confirm('Delete this course and all its assignments?')) return;

    this.courses = this.courses.filter((c) => c.id !== courseId);
    this.tasks = this.tasks.filter((t) => t.courseId !== courseId);
    this.saveCourses();
    this.saveTasks();
    this.renderCourses();
    this.renderTasks();
    this.updateStats();
    this.renderWeeklySchedule();
    this.showNotification('Course deleted', 'success');
  },

  updateCourseSelect() {
    const courseSelect = document.getElementById('courseSelect');
    courseSelect.innerHTML = '<option value="">Select a course...</option>';
    this.courses.forEach((course) => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = `${course.code} - ${course.name}`;
      courseSelect.appendChild(option);
    });
  },

  getCourseColor(courseId) {
    if (!this.courseColors[courseId]) {
      const colors = [
        '#667eea',
        '#764ba2',
        '#f093fb',
        '#4facfe',
        '#43e97b',
        '#fa709a',
        '#fee140',
        '#30cfd0',
        '#a8edea',
        '#fed6e3',
        '#c471f5',
        '#fa8231',
        '#17ead9',
        '#6078ea',
        '#f76b1c',
        '#5f72bd',
      ];
      const index = Object.keys(this.courseColors).length % colors.length;
      this.courseColors[courseId] = colors[index];
    }
    return this.courseColors[courseId];
  },
});
