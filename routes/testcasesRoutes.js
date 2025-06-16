const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { checkAdmin } = require('../controllers/userController');
const {
    deleteTestcase
} = require('../controllers/testcaseController');
const router = express.Router();
// Testcase routes
router.post('/delete', verifyToken, checkAdmin, deleteTestcase);
module.exports = router;