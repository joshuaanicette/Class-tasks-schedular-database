// Grades behavior, installed before the scheduler is constructed.
Object.assign(TaskSchedulerPro.prototype, {
  calculateCourseGrade(courseId) {
    const course = this.courses.find((c) => c.id === courseId);
    if (!course || !course.gradeCategories || course.gradeCategories.length === 0) {
      return null;
    }

    const courseTasks = this.tasks.filter((t) => t.courseId === courseId && t.completed && t.grade);
    if (courseTasks.length === 0) return null;

    let totalWeightedGrade = 0;
    let totalWeight = 0;

    course.gradeCategories.forEach((category) => {
      const categoryTasks = courseTasks.filter((t) => t.category === category.name);
      if (categoryTasks.length === 0) return;

      const categoryAvg =
        categoryTasks.reduce((sum, task) => {
          const grade = this.gradeToNumber(task.grade);
          return sum + (grade || 0);
        }, 0) / categoryTasks.length;

      totalWeightedGrade += (categoryAvg * category.weight) / 100;
      totalWeight += category.weight;
    });

    if (totalWeight === 0) return null;

    const finalGrade = (totalWeightedGrade / totalWeight) * 100;
    return this.numberToGrade(finalGrade);
  },

  gradeToNumber(grade) {
    const gradeMap = {
      'A+': 97,
      A: 93,
      'A-': 90,
      'B+': 87,
      B: 83,
      'B-': 80,
      'C+': 77,
      C: 73,
      'C-': 70,
    };

    if (gradeMap[grade]) return gradeMap[grade];
    const num = parseFloat(grade);
    return !isNaN(num) ? num : null;
  },

  numberToGrade(num) {
    if (num >= 97) return 'A+';
    if (num >= 93) return 'A';
    if (num >= 90) return 'A-';
    if (num >= 87) return 'B+';
    if (num >= 83) return 'B';
    if (num >= 80) return 'B-';
    return `${num.toFixed(1)}%`;
  },

  updateGradeCalcCourseSelect() {
    const select = document.getElementById('gradeCalcCourseSelect');
    select.innerHTML = '<option value="">Choose a course...</option>';
    this.courses.forEach((course) => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = `${course.code} - ${course.name}`;
      select.appendChild(option);
    });
  },

  renderGradeCalculator() {
    const courseId = parseInt(document.getElementById('gradeCalcCourseSelect').value);
    const content = document.getElementById('gradeCalculatorContent');

    if (!courseId) {
      content.innerHTML = '';
      return;
    }

    const course = this.courses.find((c) => c.id === courseId);
    if (!course || !course.gradeCategories || course.gradeCategories.length === 0) {
      content.innerHTML =
        '<p style="color: var(--text-secondary);">This course has no grade categories set up.</p>';
      return;
    }

    const currentGrade = this.calculateCourseGrade(courseId);

    let html = `
            <div class="current-grade-display">
                ${currentGrade || 'No grades yet'}
            </div>

            <h3 style="margin: 30px 0 20px;">Grade Breakdown by Category</h3>
            <div class="grade-breakdown">
        `;

    course.gradeCategories.forEach((category) => {
      const categoryTasks = this.tasks.filter(
        (t) => t.courseId === courseId && t.category === category.name,
      );
      const gradedTasks = categoryTasks.filter((t) => t.completed && t.grade);

      let categoryGrade = '-';
      if (gradedTasks.length > 0) {
        const avg =
          gradedTasks.reduce((sum, t) => {
            const grade = this.gradeToNumber(t.grade);
            return sum + (grade || 0);
          }, 0) / gradedTasks.length;
        categoryGrade = this.numberToGrade(avg);
      }

      html += `
                <div class="breakdown-item">
                    <div class="breakdown-label">${category.name}</div>
                    <div class="breakdown-stats">${category.weight}%</div>
                    <div class="breakdown-stats">${gradedTasks.length}/${categoryTasks.length} graded</div>
                    <div class="breakdown-stats" style="font-weight: bold; color: var(--accent);">${categoryGrade}</div>
                </div>
            `;
    });

    html += `
            </div>

            <div class="what-if-calculator">
                <h3>💡 What-If Calculator</h3>
                <p style="color: var(--text-secondary); margin-bottom: 15px;">
                    Calculate what grade you need on remaining assignments
                </p>
                <p style="font-style: italic; color: var(--text-secondary);">
                    Coming soon: Interactive calculator to determine grades needed for target GPA
                </p>
            </div>
        `;

    content.innerHTML = html;
  },

  calculateOverallGPA() {
    const gradedCourses = this.courses.filter((course) => {
      const courseGrade = this.calculateCourseGrade(course.id);
      return courseGrade && course.credits;
    });

    if (gradedCourses.length === 0) return null;

    let totalPoints = 0;
    let totalCredits = 0;

    gradedCourses.forEach((course) => {
      const grade = this.calculateCourseGrade(course.id);
      const gradeNum = this.gradeToNumber(grade);
      if (gradeNum && course.credits) {
        // Convert percentage to 4.0 GPA scale
        let gpaPoints;
        if (gradeNum >= 93) gpaPoints = 4.0;
        else if (gradeNum >= 90) gpaPoints = 3.7;
        else if (gradeNum >= 87) gpaPoints = 3.3;
        else if (gradeNum >= 83) gpaPoints = 3.0;
        else if (gradeNum >= 80) gpaPoints = 2.7;
        else if (gradeNum >= 77) gpaPoints = 2.3;
        else if (gradeNum >= 73) gpaPoints = 2.0;
        else if (gradeNum >= 70) gpaPoints = 1.7;
        else if (gradeNum >= 67) gpaPoints = 1.3;
        else if (gradeNum >= 65) gpaPoints = 1.0;
        else gpaPoints = 0.0;

        totalPoints += gpaPoints * course.credits;
        totalCredits += course.credits;
      }
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : null;
  },

  renderWhatIfCalculator() {
    const courseId = parseInt(document.getElementById('whatIfCourseSelect').value);
    const content = document.getElementById('whatIfCalculatorContent');

    if (!courseId) {
      content.innerHTML =
        '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Select a course to use What-If calculator</p>';
      return;
    }

    const course = this.courses.find((c) => c.id === courseId);
    if (!course || !course.gradeCategories || course.gradeCategories.length === 0) {
      content.innerHTML =
        '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">No grade categories set for this course</p>';
      return;
    }

    const currentGrade = this.calculateCourseGrade(courseId);

    let html = `
            <div class="grade-breakdown">
                <h3>Current Grade: ${currentGrade || 'Not enough data'}</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">Enter hypothetical grades to see what you'd need to achieve your target</p>

                <div class="form-group">
                    <label>Target Grade</label>
                    <select id="whatIfTargetGrade">
                        <option value="97">A+ (97%)</option>
                        <option value="93" selected>A (93%)</option>
                        <option value="90">A- (90%)</option>
                        <option value="87">B+ (87%)</option>
                        <option value="83">B (83%)</option>
                        <option value="80">B- (80%)</option>
                    </select>
                </div>
        `;

    // Show each category with completed + upcoming assignments
    course.gradeCategories.forEach((category) => {
      const categoryTasks = this.tasks.filter(
        (t) => t.courseId === courseId && t.category === category.name,
      );
      const completed = categoryTasks.filter((t) => t.completed && t.grade);
      const upcoming = categoryTasks.filter((t) => !t.completed);

      html += `
                <div class="category-section" style="margin: 20px 0; padding: 20px; background: var(--hover-bg); border-radius: 10px;">
                    <h4>${category.name} (${category.weight}%)</h4>
                    <p style="color: var(--text-secondary); font-size: 0.9em;">
                        Completed: ${completed.length} | Upcoming: ${upcoming.length}
                    </p>
            `;

      if (completed.length > 0) {
        const avg =
          completed.reduce((sum, t) => sum + this.gradeToNumber(t.grade), 0) / completed.length;
        html += `<p>Current average: <strong>${avg.toFixed(1)}%</strong></p>`;
      }

      // Input for hypothetical grade on upcoming assignments
      if (upcoming.length > 0) {
        html += `
                    <div class="form-group" style="margin-top: 10px;">
                        <label>If you get this grade on remaining ${upcoming.length} assignment(s):</label>
                        <input type="number" class="what-if-input" data-category="${category.name}" min="0" max="100" placeholder="Enter grade (0-100)">
                    </div>
                `;
      }

      html += `</div>`;
    });

    html += `
            <button class="add-btn" onclick="taskScheduler.calculateWhatIf(${courseId})">Calculate What I Need</button>
            <div id="whatIfResult" style="margin-top: 20px;"></div>
        </div>
        `;

    content.innerHTML = html;
  },

  calculateWhatIf(courseId) {
    const course = this.courses.find((c) => c.id === courseId);
    const targetGrade = parseFloat(document.getElementById('whatIfTargetGrade').value);
    const resultDiv = document.getElementById('whatIfResult');

    // Get hypothetical grades entered
    const inputs = document.querySelectorAll('.what-if-input');
    const hypotheticals = {};
    inputs.forEach((input) => {
      if (input.value) {
        hypotheticals[input.dataset.category] = parseFloat(input.value);
      }
    });

    // Calculate weighted grade with hypotheticals
    let totalWeightedGrade = 0;
    let totalWeight = 0;
    let messages = [];

    course.gradeCategories.forEach((category) => {
      const categoryTasks = this.tasks.filter(
        (t) => t.courseId === courseId && t.category === category.name,
      );
      const completed = categoryTasks.filter((t) => t.completed && t.grade);
      const upcoming = categoryTasks.filter((t) => !t.completed);

      let categoryAvg = 0;

      if (completed.length > 0 && upcoming.length > 0 && hypotheticals[category.name]) {
        // Mix completed grades with hypothetical
        const completedSum = completed.reduce((sum, t) => sum + this.gradeToNumber(t.grade), 0);
        const hypotheticalSum = hypotheticals[category.name] * upcoming.length;
        categoryAvg = (completedSum + hypotheticalSum) / (completed.length + upcoming.length);
        messages.push(
          `${category.name}: If you get ${hypotheticals[category.name]}% on ${upcoming.length} remaining, avg would be ${categoryAvg.toFixed(1)}%`,
        );
      } else if (completed.length > 0) {
        categoryAvg =
          completed.reduce((sum, t) => sum + this.gradeToNumber(t.grade), 0) / completed.length;
      } else if (hypotheticals[category.name]) {
        categoryAvg = hypotheticals[category.name];
        messages.push(`${category.name}: Assuming ${categoryAvg}%`);
      }

      if (categoryAvg > 0) {
        totalWeightedGrade += (categoryAvg * category.weight) / 100;
        totalWeight += category.weight;
      }
    });

    const projectedGrade = (totalWeightedGrade / totalWeight) * 100;

    let resultHTML = `
            <div style="padding: 20px; background: var(--card-bg); border-radius: 10px; border: 2px solid var(--accent);">
                <h3>📊 Projected Grade: ${projectedGrade.toFixed(1)}% (${this.numberToGrade(projectedGrade)})</h3>
                <p style="margin: 10px 0;"><strong>Target:</strong> ${targetGrade}% (${this.numberToGrade(targetGrade)})</p>
        `;

    if (projectedGrade >= targetGrade) {
      resultHTML += `<p style="color: var(--success); font-weight: bold;">✅ You're on track to meet your target!</p>`;
    } else {
      const needed = targetGrade - projectedGrade;
      resultHTML += `<p style="color: var(--warning); font-weight: bold;">⚠️ You need ${needed.toFixed(1)} more percentage points to reach your target.</p>`;
    }

    if (messages.length > 0) {
      resultHTML += `<div style="margin-top: 15px; padding: 15px; background: var(--hover-bg); border-radius: 8px;">`;
      messages.forEach((msg) => {
        resultHTML += `<p style="font-size: 0.9em; margin: 5px 0;">• ${msg}</p>`;
      });
      resultHTML += `</div>`;
    }

    resultHTML += `</div>`;
    resultDiv.innerHTML = resultHTML;
  },

  updateWhatIfCourseSelect() {
    const select = document.getElementById('whatIfCourseSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Choose a course...</option>';
    this.courses.forEach((course) => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = `${course.code} - ${course.name}`;
      select.appendChild(option);
    });
  },
});
