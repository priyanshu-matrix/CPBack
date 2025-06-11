const express = require('express');

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
router.post('/add', createProblem);
router.put('/edit', editProblem);
router.delete('/delete', deleteProblem);
router.get('/get', getProblemById);
router.get('/getall', getAllProblems);
module.exports = router;