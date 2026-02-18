/**
 * PDF export for relay teams. Used by main process only.
 */
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { PDF: PDF_LAYOUT, PDF_STROKE_KEYS } = require('./constants');

function formatTimeMMSS(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return '–';
  const s = Number(sec);
  const min = Math.floor(s / 60);
  const remainder = (s % 60).toFixed(2);
  return `${min}:${remainder.padStart(5, '0')}`;
}

function formatTime(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return '–';
  return `${Number(sec).toFixed(2)}s`;
}

/** Draw a simple table; returns new y. */
function drawTable(doc, x, y, colWidths, rows, options = {}) {
  const { headerRow = false, rowHeight = 18, fontSize = 10 } = options;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  doc.fontSize(fontSize);

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isHeader = headerRow && r === 0;
    if (isHeader) {
      doc.rect(x, y, tableWidth, rowHeight).fill('#e5e7eb');
      doc.fillColor('#111827').font('Helvetica-Bold');
    }
    let cx = x;
    for (let c = 0; c < row.length; c++) {
      const w = colWidths[c] || 80;
      doc.rect(cx, y, w, rowHeight).stroke();
      const pad = 5;
      const text = (row[c] || '').toString().slice(0, 35);
      doc.fillColor(isHeader ? '#111827' : '#000000').text(text, cx + pad, y + (rowHeight - fontSize) / 2, { width: w - 2 * pad });
      cx += w;
    }
    if (isHeader) doc.font('Helvetica').fillColor('#000000');
    y += rowHeight;
  }
  return y;
}

/**
 * Generate teams PDF and write to filePath.
 * @param {string} filePath
 * @param {{ meetName: string, meetDate?: string, meetLocation?: string, teams: object }} options
 * @returns {Promise<string>}
 */
function generateTeamsPDF(filePath, { meetName, meetDate, meetLocation, teams }) {
  const M = PDF_LAYOUT.MARGIN;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: M, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(24).font('Helvetica-Bold').fillColor('#0f172a').text(meetName || 'Relay Teams', M, PDF_LAYOUT.HEADER_TITLE_Y, { continued: false });
    let headerY = PDF_LAYOUT.HEADER_SUB_Y;
    const sub = [];
    if (meetDate) sub.push(meetDate);
    if (meetLocation) sub.push(meetLocation);
    if (sub.length) {
      doc.fontSize(11).font('Helvetica').fillColor('#64748b').text(sub.join('  ·  '), M, headerY, { continued: false });
      headerY += 22;
    }
    doc.fontSize(11).fillColor('#000000');
    let y = headerY + 10;

    if (!teams || typeof teams !== 'object') {
      doc.text('No teams data.', M, y);
      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
      doc.on('error', reject);
      return;
    }

    const colWidths = [PDF_LAYOUT.COL_LEG, PDF_LAYOUT.COL_NAME, PDF_LAYOUT.COL_AGE, PDF_LAYOUT.COL_TIME];

    for (const [eventName, teamList] of Object.entries(teams)) {
      if (!Array.isArray(teamList) || teamList.length === 0) continue;

      if (y > PDF_LAYOUT.Y_MAX_FIRST_PAGE) {
        doc.addPage();
        y = PDF_LAYOUT.Y_RESET_AFTER_PAGE;
      }
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af').text(eventName, M, y, { continued: false });
      y += 24;

      for (const team of teamList) {
        if (y > PDF_LAYOUT.Y_MAX_OTHER_PAGES) {
          doc.addPage();
          y = PDF_LAYOUT.Y_RESET_AFTER_PAGE;
        }
        const [lo, hi] = team.age_group_range || [0, 0];
        const swimmers = team.swimmers || [];
        const isMedley = team.is_medley && team.stroke_labels && team.stroke_labels.length;

        const tableRows = [];
        if (isMedley) {
          tableRows.push(['Leg', 'Swimmer', 'Age', 'Time']);
          swimmers.forEach((s, i) => {
            const time = s[PDF_STROKE_KEYS[i]];
            tableRows.push([
              (team.stroke_labels && team.stroke_labels[i]) || `Leg ${i + 1}`,
              (s.full_name || '').trim(),
              s.age != null ? String(s.age) : '–',
              formatTime(time),
            ]);
          });
        } else {
          tableRows.push(['Leg', 'Swimmer', 'Age', 'Time']);
          swimmers.forEach((s, i) => {
            tableRows.push([`${i + 1}`, (s.full_name || '').trim(), s.age != null ? String(s.age) : '–', formatTime(s.freestyle_50)]);
          });
        }

        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        doc.text(`Age group ${lo}–${hi}`, M, y, { continued: false });
        doc.text(`Total time: ${formatTimeMMSS(team.total_time)}  (age sum: ${team.total_age ?? '–'})`, M + 200, y, { continued: false });
        y += 18;

        y = drawTable(doc, M, y, colWidths, tableRows, { headerRow: true, rowHeight: PDF_LAYOUT.TABLE_ROW_HEIGHT, fontSize: PDF_LAYOUT.TABLE_FONT_SIZE });
        y += 14;
      }
      y += 10;
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
    doc.on('error', reject);
  });
}

module.exports = { generateTeamsPDF };
