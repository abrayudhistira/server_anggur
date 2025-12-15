// logger.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const appendFile = promisify(fs.appendFile);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

const LOG_DIR = path.join(__dirname, 'log'); // -> folder ./log

async function ensureLogDir() {
  try {
    await stat(LOG_DIR);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      await mkdir(LOG_DIR, { recursive: true });
    } else {
      throw err;
    }
  }
}

function pad(n) { return String(n).padStart(2, '0'); }
function filenameBaseForDate(date = new Date()) {
  const d = new Date(date);
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`; // DD-MM-YYYY
}

function ndjsonPathFor(date = new Date()) {
  return path.join(LOG_DIR, `${filenameBaseForDate(date)}.ndjson`);
}
function jsonPathFor(date = new Date()) {
  return path.join(LOG_DIR, `${filenameBaseForDate(date)}.json`);
}

/**
 * Append an object entry to today's NDJSON file (non-blocking allowed).
 * entry: object -> will be JSON.stringify(entry) + '\n'
 */
async function appendHumidity(entry, date = new Date()) {
  await ensureLogDir();
  const file = ndjsonPathFor(date);
  const line = JSON.stringify(entry) + '\n';
  return appendFile(file, line, 'utf8'); // return promise
}

/**
 * Convert an NDJSON file to pretty JSON array file (atomic write).
 * date: Date or date-string
 */
async function finalizeDay(date = new Date()) {
  await ensureLogDir();
  const dt = (date instanceof Date) ? date : new Date(date);
  const ndpath = ndjsonPathFor(dt);
  const jsonpath = jsonPathFor(dt);

  let arr = [];
  try {
    const raw = await readFile(ndpath, 'utf8');
    if (raw && raw.trim().length) {
      arr = raw.split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line); }
        catch (e) { return { _parse_error: true, raw: line }; }
      });
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      arr = [];
    } else {
      throw err;
    }
  }

  // atomic-ish: write tmp then rename
  const tmp = jsonpath + '.tmp';
  await writeFile(tmp, JSON.stringify(arr, null, 2), 'utf8');
  await fs.promises.rename(tmp, jsonpath);

  return { jsonpath, count: arr.length };
}

async function finalizeYesterday() {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return finalizeDay(y);
}

module.exports = {
  appendHumidity,
  finalizeDay,
  finalizeYesterday,
  ndjsonPathFor,
  jsonPathFor,
  LOG_DIR
};
