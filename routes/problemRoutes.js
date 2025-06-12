const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { checkAdmin } = require('../controllers/userController');

// need to add authtoken later
const {
    createProblem,
    editProblem,
    deleteProblem,
    getProblemById,
    getAllProblems
} = require('../controllers/problemController');
const router = express.Router();
// Problem routes
router.post('/add', verifyToken, checkAdmin, createProblem);
router.put('/edit', verifyToken, checkAdmin, editProblem);
router.delete('/delete', verifyToken, checkAdmin, deleteProblem);
router.post('/get', verifyToken, getProblemById);
router.get('/getall', verifyToken,checkAdmin, getAllProblems);
module.exports = router;