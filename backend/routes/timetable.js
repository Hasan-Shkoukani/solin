const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Debug flag
const DEBUG = true;

// Logger function
const log = (message, data) => {
  if (DEBUG) {
    console.log(`[Timetable] ${message}`, data || '');
  }
};

// Path to the Excel timetable file
const filePath = path.join(__dirname, '..', 'data', 'timetable.xlsx');

// Helper functions
const parseTimeString = (timeStr) => {
  if (!timeStr) return { startTime: '', endTime: '' };
  const parts = timeStr.split('-').map(t => t.trim());
  return {
    startTime: parts[0] || '',
    endTime: parts[1] || ''
  };
};

const formatDay = (dayStr) => {
  if (!dayStr) return '';
  const match = dayStr.match(/\((.*?)\)/);
  return match ? match[1].trim() : dayStr.trim();
};

const formatLocation = (locationStr) => {
  return locationStr ? String(locationStr).trim() : '';
};

// Add error handler middleware
router.use((err, req, res, next) => {
  log('Route error:', err);
  res.status(500).json({
    message: "Internal server error",
    error: err.message
  });
});

router.get('/:courseCode', async (req, res) => {
  const startTime = Date.now();
  const searchCode = req.params.courseCode.replace(/\s+/g, '').toUpperCase();
  
  log('Search request started:', { courseCode: searchCode });

  try {
    // Check file existence
    if (!fs.existsSync(filePath)) {
      log('File not found:', filePath);
      return res.status(404).json({
        message: "Timetable file not found",
        path: filePath
      });
    }

    // Load workbook
    log('Loading Excel file...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      log('No worksheet found');
      return res.status(404).json({ message: "No worksheet found in timetable file" });
    }

    const results = [];
    let searchAttempts = 0;

    // Process each row
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 4) return; // Skip headers

      const location = row.getCell(1).value;

      // Process each cell in the row
      for (let i = 5; i < row.cellCount; i++) {
        const cell = row.getCell(i);
        if (!cell || !cell.value) continue;

        const cellText = String(cell.value).trim();
        const normalizedCellText = cellText.replace(/\s+/g, '').toUpperCase();
        searchAttempts++;

        // Debug cell check
        log('Checking cell:', {
          rowNumber,
          column: i,
          text: cellText,
          normalized: normalizedCellText,
          searchCode
        });

        // Check for match
        if (normalizedCellText.includes(searchCode)) {
          log('Match found:', cellText);

          const dayLabel = String(worksheet.getCell(2, i).value || '').trim();
          const timeLabel = String(worksheet.getCell(3, i).value || '').trim();
          const { startTime, endTime } = parseTimeString(timeLabel);

          results.push({
            title: cellText,
            day: formatDay(dayLabel),
            startTime,
            endTime,
            location: formatLocation(location)
          });
        }
      }
    });

    // Log search summary
    const endTime = Date.now();
    log('Search completed:', {
      duration: `${endTime - startTime}ms`,
      searchCode,
      cellsChecked: searchAttempts,
      matchesFound: results.length
    });

    if (results.length === 0) {
      return res.status(404).json({
        message: `No schedule found for course code: ${searchCode}`,
        courseCode: searchCode,
        searchAttempts
      });
    }

    res.json({
      schedule: results,
      courseCode: searchCode,
      matchCount: results.length,
      searchAttempts,
      processingTime: `${endTime - startTime}ms`
    });

  } catch (err) {
    log('Error in timetable route:', err);
    res.status(500).json({
      message: "Failed to parse timetable",
      error: err.message,
      courseCode: searchCode
    });
  }
});

module.exports = router;
