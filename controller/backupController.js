// controllers/backupController.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../services/logger'); // path sesuai proyekmu

// trigger manual finalize day (optional: pass date as body e.g. { date: '2025-12-17' })
exports.triggerFinalize = async (req, res) => {
  try {
    const { date } = req.body || {};
    const dt = date ? new Date(date) : new Date();
    const result = await logger.finalizeDay(dt);
    return res.status(201).json({ message: 'Finalize berhasil', result });
  } catch (err) {
    console.error('triggerFinalize error', err);
    return res.status(500).json({ message: 'Gagal finalize', error: err.message });
  }
};

// list all JSON backup files in logger.LOG_DIR
exports.listJsonBackups = async (req, res) => {
  try {
    const dir = logger.LOG_DIR;
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    // gather metadata
    const list = await Promise.all(jsonFiles.map(async fname => {
      const st = await fs.stat(path.join(dir, fname));
      return { fileName: fname, size: st.size, updatedAt: st.mtime };
    }));
    // sort by updatedAt desc
    list.sort((a,b) => b.updatedAt - a.updatedAt);
    return res.json({ data: list });
  } catch (err) {
    console.error('listJsonBackups error', err);
    return res.status(500).json({ message: 'Gagal list backups', error: err.message });
  }
};

// get JSON content by filename (safe)
exports.getBackupByName = async (req, res) => {
  try {
    const { filename } = req.params;
    const safe = path.basename(filename); // prevent path traversal
    const jsonPath = logger.jsonPathFor(); // returns path for today but we need for given name
    // compute full path
    const filePath = path.join(logger.LOG_DIR, safe);
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return res.json({ fileName: safe, data });
  } catch (err) {
    console.error('getBackupByName error', err);
    if (err.code === 'ENOENT') return res.status(404).json({ message: 'File not found' });
    return res.status(500).json({ message: 'Gagal membaca file', error: err.message });
  }
};

// download as attachment
exports.downloadBackupByName = async (req, res) => {
  try {
    const { filename } = req.params;
    const safe = path.basename(filename);
    const filePath = path.join(logger.LOG_DIR, safe);
    return res.download(filePath);
  } catch (err) {
    console.error('downloadBackupByName error', err);
    return res.status(500).json({ message: 'Gagal download', error: err.message });
  }
};
