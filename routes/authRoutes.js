const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const jwtAuth = require('../middleware/jwtAuthorization');
// const isSuperAdmin = require('../middleware/isSuperAdmin');

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;