const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { checkAdmin } = require('../controllers/userController');
const {
    addContest,
    editContest,
    deleteContest,
    getContest
} = require('../controllers/contestController');

const router = express.Router();

// Contest routes
router.post('/add', verifyToken, checkAdmin, addContest);
router.put('/edit/:id', verifyToken, checkAdmin, editContest);
router.delete('/delete/:id', verifyToken, checkAdmin, deleteContest);
router.get('/getall', verifyToken, getContest);

module.exports = router;