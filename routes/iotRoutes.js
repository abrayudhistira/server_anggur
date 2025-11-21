// routes/iotRoutes.js

const express = require('express');
const router = express.Router();
const iotController = require('../controller/iotController');

router.post('/suhu', iotController.postSuhu);

module.exports = router;