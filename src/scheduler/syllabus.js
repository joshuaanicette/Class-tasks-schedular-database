// Syllabus behavior, installed before the scheduler is constructed.
Object.assign(TaskSchedulerPro.prototype, {
  async handleSyllabusUpload(file) {
    if (!file) return;

    const uploadDiv = document.getElementById('syllabusUpload');
    uploadDiv.classList.add('has-file');
    uploadDiv.innerHTML = '<p>📄 Processing syllabus...</p>';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      this.syllabusText = fullText;

      // Parse categories and dates
      const categories = this.parseGradeCategories(fullText);
      const dates = this.parseDates(fullText);

      // Update UI
      if (categories.length > 0) {
        this.tempCategories = categories;
        this.renderCategories();
      }

      uploadDiv.innerHTML = `
                <p style="color: var(--success);">✓ Syllabus uploaded successfully!</p>
                <p style="font-size: 0.9em; margin-top: 10px;">
                    Found ${categories.length} grade categories and ${dates.length} potential due dates
                </p>
                <button type="button" style="margin-top: 10px; padding: 8px 15px; background: var(--info); color: white; border: none; border-radius: 6px; cursor: pointer;"
                        onclick="taskScheduler.showExtractedDates()">
                    View Extracted Dates
                </button>
            `;

      this.extractedDates = dates;
      this.showNotification(
        `Extracted ${categories.length} categories and ${dates.length} dates!`,
        'success',
      );
    } catch (error) {
      console.error('Error parsing PDF:', error);
      uploadDiv.classList.remove('has-file');
      uploadDiv.innerHTML =
        '<p style="color: var(--danger);">Error parsing PDF. Please try again.</p>';
      this.showNotification('Error parsing syllabus PDF', 'error');
    }
  },

  parseGradeCategories(text) {
    const categories = [];
    const lines = text.split('\n');

    // Common patterns for grade breakdowns
    const patterns = [
      /(\w+[\w\s]*?)[\s:]+(\d+)%/gi, // "Exams: 40%"
      /(\d+)%[\s-]+(\w+[\w\s]*)/gi, // "40% - Exams"
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let name, weight;
        if (match[1] && !isNaN(match[2])) {
          name = match[1].trim();
          weight = parseFloat(match[2]);
        } else if (match[2] && !isNaN(match[1])) {
          name = match[2].trim();
          weight = parseFloat(match[1]);
        }

        if (name && weight && weight <= 100) {
          // Filter out common false positives
          if (!name.match(/^\d+$/) && name.length > 2 && name.length < 50) {
            categories.push({
              id: Date.now() + Math.random(),
              name: this.cleanCategoryName(name),
              weight,
            });
          }
        }
      }
    });

    // Remove duplicates
    const uniqueCategories = [];
    const seen = new Set();
    categories.forEach((cat) => {
      const key = cat.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCategories.push(cat);
      }
    });

    return uniqueCategories;
  },

  cleanCategoryName(name) {
    // Remove common prefixes/suffixes
    name = name.replace(/^(the|a|an)\s+/i, '');
    name = name.replace(/\s+(grade|score|points?)$/i, '');
    // Capitalize first letter of each word
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  parseDates(text) {
    const dates = [];
    const lines = text.split('\n');

    // Date patterns
    const datePatterns = [
      /(\w+)\s+(\d{1,2})[,\s]+(\d{4})/gi, // "January 15, 2025"
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, // "1/15/2025" or "1/15/25"
      /(\d{1,2})-(\d{1,2})-(\d{2,4})/g, // "1-15-2025"
      /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/gi, // "January 15th"
    ];

    lines.forEach((line) => {
      datePatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          try {
            const dateStr = match[0];
            const parsedDate = new Date(dateStr);
            if (parsedDate && !isNaN(parsedDate.getTime())) {
              // Extract context (assignment description)
              const context = line.trim().substring(0, 100);
              dates.push({
                date: parsedDate,
                text: dateStr,
                context: context,
              });
            }
          } catch (e) {
            // Skip invalid dates
          }
        }
      });
    });

    return dates.filter((d) => d.date > new Date()); // Only future dates
  },

  showExtractedDates() {
    if (!this.extractedDates || this.extractedDates.length === 0) {
      alert('No dates found in syllabus.');
      return;
    }

    let message = 'Extracted Dates:\n\n';
    this.extractedDates.slice(0, 10).forEach((d) => {
      message += `${d.date.toLocaleDateString()}: ${d.context}\n\n`;
    });

    if (this.extractedDates.length > 10) {
      message += `... and ${this.extractedDates.length - 10} more dates`;
    }

    alert(message + '\n\nYou can manually add these as assignments.');
  },
});
