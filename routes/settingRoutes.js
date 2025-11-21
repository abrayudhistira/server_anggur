const express = require('express');
const router = express.Router();
const settingController = require('../controller/settingController'); 
const { verifyTokenAndRole } = require('../middleware/authMiddleware'); 

router.get('/all',settingController.getAllSettings);

router.put('/valve', settingController.updateValveStatus);

router.put('/mode', settingController.updateModeStatus);


module.exports = router;