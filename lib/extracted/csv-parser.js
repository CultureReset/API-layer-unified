// EXTRACTED FROM: Admin-dashboard-main/src/lib/csv.js — converted from ES
// module exports to CommonJS to match this repo's convention. Picked over
// the dead csv-import-system.js found in cybercheck-login (confirmed dead
// code there, and confirmed to NOT handle escaped double-quotes at all) and
// over admin.html's inline parseCSVLine() (confirmed correct for a single
// line, but this version additionally handles a quoted field containing a
// literal newline, which a plain line-by-line split tears in half).
//
// WHAT IT DOES: a correct CSV parser — quoted fields, embedded commas,
// ""-escaped quotes, and multi-line quoted fields all round-trip properly.
//
// STATUS: standalone, environment-agnostic (no browser dependency — the
// source file's readFileText() used FileReader and is intentionally NOT
// included here; that half belongs in a browser context and is extracted
// separately into Check-user-'s and Master-check's own extracted/
// folders). Not wired into any route — this platform has no bulk-CSV-import
// feature yet. Wire this in the day one exists, for either a bulk-install
// or bulk-tenant-import admin feature.

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.map((value) => value.trim());
}

function parseCsv(text) {
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n');
  const lines = [];
  let buffer = '';
  let quoteCount = 0;

  for (const line of normalized.split('\n')) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    quoteCount += (line.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      if (buffer.trim()) lines.push(buffer);
      buffer = '';
      quoteCount = 0;
    }
  }
  if (buffer.trim()) lines.push(buffer);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^﻿/, ''));
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index] ?? ''; });
    return row;
  });

  return { headers, rows };
}

function compactRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== '' && value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  const text = String(value ?? '').trim().toLowerCase();
  return ['true', 'yes', 'y', '1', 'x'].includes(text);
}

module.exports = { parseCsvLine, parseCsv, compactRow, toBoolean };
