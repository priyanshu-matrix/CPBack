const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { checkAdmin } = require("../controllers/userController");
const {
    addContest,
    editContest,
    deleteContest,
    getContest,
    startContestRound,
    updateMatchWinner,
    getContestById,
    addProblemToContest,
    getContestProblems,
    getRandomContestProblem
} = require("../controllers/contestController");

const router = express.Router();

// Contest routes
router.post("/add", verifyToken, checkAdmin, addContest);
router.put("/edit/:id", verifyToken, checkAdmin, editContest);
router.delete("/delete/:id", verifyToken, checkAdmin, deleteContest);
router.get("/getcon/:id", verifyToken, getContestById);
router.get("/getall", verifyToken, getContest);

// start contest by admin, need contest id as request param
router.post("/startContest", verifyToken, checkAdmin, startContestRound);
router.post("/updateMatchWinner", verifyToken, checkAdmin, updateMatchWinner);

// Add a problem to a contest
router.post("/addProblemToContest",verifyToken,checkAdmin, addProblemToContest); //will add authtoken and admin check later
router.get("/getContestProblems/:id", verifyToken, checkAdmin, getContestProblems);
router.get("/getRandomContestProblem/:id", verifyToken, getRandomContestProblem);
//http://localhost:3000/api/contests/getContestProblems/:id

module.exports = router;
