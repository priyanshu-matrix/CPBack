const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { login, signup, adminDashboard, userInfo, checkAdmin, fetchAllUsers, registerContest, checkContestRegistration, changeUserStatus, searchMatch } = require('../controllers/userController');

// Admin dashboard route
router.post('/login', verifyToken, login);
router.post('/signup', verifyToken, signup);
router.get('/admin', verifyToken, checkAdmin, adminDashboard);
router.get('/info', verifyToken, userInfo);
router.get('/all', verifyToken, fetchAllUsers);
router.post('/registerContest', verifyToken, registerContest);
router.get('/checkContestRegistration/:contestId', verifyToken, checkContestRegistration);
router.post('/changeUserStatus', verifyToken, changeUserStatus);

// Search match route
router.get('/searchMatch', verifyToken, searchMatch);


module.exports = router;