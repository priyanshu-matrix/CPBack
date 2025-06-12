const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { checkAdmin } = require('../controllers/userController');
const multer = require('multer');

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
const upload = multer({ storage: multer.memoryStorage() });

router.post('/add', upload.single('testCasesFile'), verifyToken, checkAdmin, createProblem);
router.put('/edit', verifyToken, checkAdmin, editProblem);
router.delete('/delete', verifyToken, checkAdmin, deleteProblem);
router.post('/get', verifyToken, getProblemById);
router.get('/getall', verifyToken,checkAdmin, getAllProblems);
module.exports = router;