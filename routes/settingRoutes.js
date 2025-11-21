const express = require('express');
const router = express.Router();
const settingController = require('../controller/settingController'); 


router.get('/status', settingController.getSettingStatus);


router.put('/status', settingController.updateSettingStatus);

module.exports = router;