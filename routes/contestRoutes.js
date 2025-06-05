const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { checkAdmin } = require("../controllers/userController");
const {
    addContest,
    editContest,
    deleteContest,
    getContest,
    startContestRound,
} = require("../controllers/contestController");

const router = express.Router();

// Contest routes
router.post("/add", verifyToken, checkAdmin, addContest);
router.put("/edit/:id", verifyToken, checkAdmin, editContest);
router.delete("/delete/:id", verifyToken, checkAdmin, deleteContest);
router.get("/getall", verifyToken, getContest);

// start contest by admin, need contest id as request param
router.post("/startContest", verifyToken, checkAdmin, startContestRound);


module.exports = router;
