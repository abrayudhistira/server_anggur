// routes/backups.js
const express = require('express');
const router = express.Router();
const backupCtrl = require('../controller/backupController');
const jwtAuth = require('../middleware/authMiddleware'); // optional, gunakan auth

router.post('/trigger', jwtAuth, backupCtrl.triggerFinalize);          // manual finalize
router.get('/', jwtAuth, backupCtrl.listJsonBackups);                 // list .json files
router.get('/:filename', jwtAuth, backupCtrl.getBackupByName);        // get json content
router.get('/:filename/download', jwtAuth, backupCtrl.downloadBackupByName); // download

module.exports = router;
