const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { login, signup, adminDashboard, userInfo, checkAdmin } = require('../controllers/userController');

// Admin dashboard route
router.post('/login', verifyToken, login);
router.post('/signup', verifyToken, signup);
router.get('/admin', verifyToken, checkAdmin, adminDashboard);
router.get('/info', verifyToken, userInfo);

module.exports = router;