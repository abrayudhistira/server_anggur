const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const jwtAuth = require('../middleware/authMiddleware');
// const isSuperAdmin = require('../middleware/isSuperAdmin');

router.post('/register', jwtAuth, authController.register);
router.post('/login', authController.login);
router.get('/all-users', jwtAuth, authController.getAllUsers);
router.post('/reset-password', jwtAuth, authController.resetPassword);
router.post('/update-role', jwtAuth, authController.updateRole);

module.exports = router;