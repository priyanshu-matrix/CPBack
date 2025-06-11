const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

const { getLanguages, submitCode } = require('../controllers/compilerController');

// router.get('/getLanguages', verifyToken, getLanguages);
// router.post('/submitCode', verifyToken, submitCode);

// for testing
router.get('/getLanguages', getLanguages);
router.post('/submitCode', submitCode);


module.exports = router;