const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const jwtAuth = require('../middleware/authMiddleware');
// const isSuperAdmin = require('../middleware/isSuperAdmin');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/all-users', jwtAuth, authController.getAllUsers);
router.post('/reset-password', jwtAuth, authController.resetPassword);
router.post('/update-role', jwtAuth, authController.updateRole);
router.post('/update-username', jwtAuth, authController.updateUsername);
router.post('/delete-account', jwtAuth, authController.deleteAccount);

module.exports = router;