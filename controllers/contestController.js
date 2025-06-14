const Contest = require("../models/Contests");
const Problem = require("../models/Problems"); // Import the Problem model
const mongoose = require("mongoose"); // Import mongoose

// Add a new contest
const addContest = async (req, res) => {
  try {
    const newContest = new Contest(req.body);
    await newContest.save();
    res
      .status(201)
      .json({ message: "Contest added successfully", contest: newContest });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding contest", error: error.message });
  }
};

// Edit an existing contest
const editContest = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedContest = await Contest.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedContest) {
      return res.status(404).json({ message: "Contest not found" });
    }
    res.status(200).json({
      message: "Contest updated successfully",
      contest: updatedContest,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating contest", error: error.message });
  }
};

// Delete a contest
const deleteContest = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedContest = await Contest.findByIdAndDelete(id);

    if (!deletedContest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Remove the contest from all users' registeredContests array
    await mongoose
      .model("User")
      .updateMany(
        { "registeredContests.contestId": id },
        { $pull: { registeredContests: { contestId: id } } }
      );

    res.status(200).json({ message: "Contest deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting contest", error: error.message });
  }
};

// Get contest by ID
const getContestById = async (req, res) => {
  try {
    const { id } = req.params;
    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }
    res.status(200).json({ contest });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching contest", error: error.message });
  }
};

// Get all contests
const getContest = async (_req, res) => {
  try {
    const contests = await Contest.find();
    res.status(200).json({ contests });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching contests", error: error.message });
  }
};

async function createMatches(ContestID, round, contestDataForMatches) {
  try {
    // Use the passed contestDataForMatches instead of fetching
    if (!contestDataForMatches) {
      throw new Error("Contest data not provided to createMatches");
    }

    let usersList = [];
    if (round == 1) {
        usersList = [...(contestDataForMatches.registeredUsers || [])];
    } else {
        const prevMatchesData = contestDataForMatches.matches.get(String(round - 1));
        if (!prevMatchesData) {
            throw new Error(
                `Cannot create matches for round ${round}: Previous round (${
                    round - 1
                }) matches not found.`
            );
        }
        for (const match of prevMatchesData) {
            if (match.winner && match.winner !== "Bye") {
                if (match.winner === match.user1 || match.winner === match.user2) {
                    usersList.push(match.winner);
                }
            }
        }
    }
    
    const n = usersList.length;
    const limit = Math.floor(Math.log2(contestDataForMatches.registeredUsers.length)) + 1; // Calculate the number of rounds needed
    
    if(round > limit) {
        throw new Error(`Tournament is over, no more rounds can be created.`);
    }
    const matches = [];

    if (n === 0) {
      // No users, no matches
    } else if (n === 1) {
      // Single user gets a bye
      matches.push({
        matchId: `${ContestID}-${round}-1`,
        user1: usersList[0],
        user2: "Bye",
        winner: usersList[0],
        status: "completed",
      });
    } else {
      // For n >= 2
      usersList.sort(() => Math.random() - 0.5); // Shuffle the users list

      let byes = 0;
      const targetSize = 2 ** Math.ceil(Math.log2(n));
      if (n !== targetSize) {
        // if n is not a power of 2
        byes = targetSize - n;
      }

      // Players who will play matches: first (n - byes) players
      for (let i = 0; i < n - byes; i += 2) {
        matches.push({
          matchId: `${ContestID}-${round}-${matches.length + 1}`,
          user1: usersList[i],
          user2: usersList[i + 1],
          status: "pending",
        });
      }

      // Players who get byes: remaining 'byes' players
      for (let i = 0; i < byes; i++) {
        const byeUserIndex = n - byes + i;
        matches.push({
          matchId: `${ContestID}-${round}-${matches.length + 1}`,
          user1: usersList[byeUserIndex],
          user2: "Bye",
          winner: usersList[byeUserIndex],
          status: "completed",
        });
      }
    }

    // Ensure matches map exists - This check is more relevant in the calling function before setting
    // if (!contestdata.matches) {
    //   contestdata.matches = new Map();
    // }

    // Do not set matches on contestdata here, and do not save.
    // contestdata.matches.set(String(round), matches);
    // await contestdata.save(); 

    return matches;
  } catch (error) {
    // Rethrow the error to be caught by the calling function
    throw error;
  }
}

const startContestRound = async (req, res) => {
  try {
    const { ContestID } = req.body;

    const contestData = await Contest.findById(ContestID);
    if (!contestData) {
      return res.status(404).json({ message: "Contest not found" });
    }

    let prevRound = contestData.currentRound || 0; // 0 = no round started

    if (prevRound >= 1) {
      const previousRoundMatches = contestData.matches.get(String(prevRound));
      if (!previousRoundMatches) {
        return res.status(500).json({
          message: `Internal error: Matches for previous round (${prevRound}) are missing.`,
        });
      }
      if (previousRoundMatches.some((match) => match.status !== "completed")) {
        return res
          .status(400)
          .json({ message: "Previous round is not completed yet" });
      }
    }

    const currentRound = prevRound + 1;
    // contestData.currentRound = currentRound; // Set this after matches are created, before save

    const roundKey = String(currentRound);
    const existingMatches = contestData.matches ? contestData.matches.get(roundKey) : undefined;


    if (existingMatches && existingMatches.length > 0) {
      return res.status(400).json({
        message: "Matches already created for this round",
      });
    }

    // Pass contestData to createMatches
    let matches = await createMatches(ContestID, currentRound, contestData);

    // Assign a random problem to each non-bye match
    if (contestData.problemlist && contestData.problemlist.length > 0) {
      matches = matches.map(match => {
        if (match.user2 !== "Bye") {
          // Assign a random problem from the problemlist
          const randomIndex = Math.floor(Math.random() * contestData.problemlist.length);
          match.problemId = contestData.problemlist[randomIndex];
        }
        return match;
      });
    }
    // Now update contestData with new round and matches
    contestData.currentRound = currentRound;
    if (!contestData.matches) {
      contestData.matches = new Map();
    }
    contestData.matches.set(roundKey, matches);
    await contestData.save(); // Single save operation

    return res.status(200).json({
      message: "Contest started successfully",
      matches: matches,
      round: currentRound,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message, error: error.message });
  }
};

const updateMatchWinner = async (req, res) => {
  try {
    const { ContestID, matchID, uid } = req.body;

    const contestData = await Contest.findById(ContestID);
    if (!contestData) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const currentRound = contestData.currentRound;
    if (!currentRound) {
        return res.status(400).json({ message: "Contest round not started or current round is not set." });
    }
    const currentMatches = contestData.matches.get(String(currentRound));

    if (!currentMatches) {
      return res
        .status(404)
        .json({ message: `Matches for current round (${currentRound}) not found.` });
    }

    let matchFound = false;
    for (const match of currentMatches) {
      if (match.matchId === matchID) {
        if (match.user1 !== uid && match.user2 !== uid) {
            return res.status(400).json({ message: "Winner is not part of this match."});
        }
        match.winner = uid;
        match.status = "completed";
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      return res
        .status(404)
        .json({ message: `Match with ID ${matchID} not found in current round.` });
    }

    await contestData.save();

    res.status(200).json({
      message: "Match winner updated successfully",
      matches: currentMatches, // Send back the updated list of matches for the round
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating match winner", error: error.message });
  }
};

// Add a problem to a contest's problem list
const addProblemToContest = async (req, res) => {
  try {
    const { ContestID, ProblemID } = req.body;

    if (!mongoose.Types.ObjectId.isValid(ContestID)) {
      return res.status(400).json({ message: "Invalid Contest ID" });
    }
    // Assuming ProblemID is the `_id` of the problem document.
    // If ProblemID refers to `question_id`, adjust the query accordingly.
    if (!mongoose.Types.ObjectId.isValid(ProblemID)) {
        return res.status(400).json({ message: "Invalid Problem ID" });
    }

    const contest = await Contest.findById(ContestID);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const problem = await Problem.findById(ProblemID);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // Check if the problem is already in the contest's problem list
    // Assuming problemlist stores problem._id
    if (contest.problemlist.includes(problem._id.toString())) {
      return res
        .status(400)
        .json({ message: "Problem already exists in the contest" });
    }

    contest.problemlist.push(problem._id.toString());
    await contest.save();

    res.status(200).json({
      message: "Problem added to contest successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adding problem to contest",
      error: error.message,
    });
  }
};

// Remove a problem from a contest's problem list
const removeProblemFromContest = async (req, res) => {
  try {
    const { ContestID, ProblemID } = req.body;

    if (!mongoose.Types.ObjectId.isValid(ContestID)) {
      return res.status(400).json({ message: "Invalid Contest ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(ProblemID)) {
      return res.status(400).json({ message: "Invalid Problem ID" });
    }

    const contest = await Contest.findById(ContestID);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Check if the problem exists in the contest's problem list
    const problemIndex = contest.problemlist.indexOf(ProblemID);
    if (problemIndex === -1) {
      return res.status(404).json({ message: "Problem not found in the contest" });
    }

    // Remove the problem from the contest's problem list
    contest.problemlist.splice(problemIndex, 1);
    
    // Remove test cases related to this problem from contest
    if (contest.testcases) {
      contest.testcases = contest.testcases.filter(testcase => 
        testcase.problemId !== ProblemID
      );
    }
    
    await contest.save();

    res.status(200).json({
      message: "Problem and its test cases removed from contest successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error removing problem from contest",
      error: error.message,
    });
  }
};

// Get all problems from a contest's problem list
const getContestProblems = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Contest ID" });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Fetch all problems from the contest's problem list
    const problems = await Problem.find({
      _id: { $in: contest.problemlist }
    });

    res.status(200).json({
      message: "Problems retrieved successfully",
      problems: problems
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching contest problems",
      error: error.message,
    });
  }
};

// Get a random problem from a contest's problem list
const getRandomContestProblem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Contest ID" });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    if (!contest.problemlist || contest.problemlist.length === 0) {
      return res.status(404).json({ message: "No problems found in this contest" });
    }

    // Get a random index from the problemlist
    const randomIndex = Math.floor(Math.random() * contest.problemlist.length);
    const randomProblemId = contest.problemlist[randomIndex];

    // Fetch the random problem
    const problem = await Problem.findById(randomProblemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.status(200).json({
      message: "Random problem retrieved successfully",
      problem: problem
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching random contest problem",
      error: error.message,
    });
  }
};
// Get match information for a specific user in the current round
const getUserMatchInfo = async (req, res) => {
  try {
    const { ContestID,uid } = req.body;
   // Get uid from authenticated user

    if (!ContestID) {
      return res.status(400).json({ message: "Contest ID is required" });
    }

    const contestData = await Contest.findById(ContestID);
    if (!contestData) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const currentRound = contestData.currentRound;
    if (!currentRound) {
      return res.status(400).json({ message: "Contest round not started or current round is not set." });
    }

    const currentMatches = contestData.matches.get(String(currentRound));
    if (!currentMatches) {
      return res.status(404).json({ message: `Matches for current round (${currentRound}) not found.` });
    }

    // Find the user's match
    const userMatch = currentMatches.find(
      match => (match.user1 === uid || match.user2 === uid)
    );

    if (!userMatch) {
      return res.status(404).json({ message: "No match found for this user in the current round." });
    }

    // Determine opponent
    const opponent = userMatch.user1 === uid ? userMatch.user2 : userMatch.user1;

    let problemDetails = null;
    if (userMatch.problemId) {
      problemDetails = await Problem.findById(userMatch.problemId);
      // Optionally, handle case where problemDetails is null (problem not found)
      // For now, it will just be null in the response if not found.
    }

    res.status(200).json({
      message: "Match information retrieved successfully",
      matchInfo: {
        matchId: userMatch.matchId,
        userId: uid,
        opponent: opponent,
        problemId: userMatch.problemId || null,
        status: userMatch.status,
        winner: userMatch.winner || null,
        round: currentRound
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user match information",
      error: error.message
    });
  }
};
// Submit a solution for a match problem
const submitMatchSolution = async (req, res) => {
  try {
    const { ContestID, uid, problemId } = req.body;
    // You may want to add a solution or answer field as well

    const contestData = await Contest.findById(ContestID);
    if (!contestData) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const currentRound = contestData.currentRound;
    if (!currentRound) {
      return res.status(400).json({ message: "Contest round not started or current round is not set." });
    }
    const currentMatches = contestData.matches.get(String(currentRound));
    if (!currentMatches) {
      return res.status(404).json({ message: `Matches for current round (${currentRound}) not found.` });
    }

    // Find the user's match
    const match = currentMatches.find(
      m => (m.user1 === uid || m.user2 === uid)
    );
    if (!match) {
      return res.status(404).json({ message: "No match found for this user in the current round." });
    }
    if (match.user2 === "Bye") {
      return res.status(400).json({ message: "You are given a bye, wait till next round." });
    }
    if (match.status === "completed") {
      return res.status(400).json({ message: "This match is already completed." });
    }
    if (match.problemId !== problemId) {
      return res.status(400).json({ message: "Submitted problem does not match the assigned problem for this match." });
    }
    // If all checks pass, set winner and complete the match
    match.winner = uid;
    match.status = "completed";
    await contestData.save();
    res.status(200).json({ message: "Solution accepted, you are the winner of this match.", match });
  } catch (error) {
    res.status(500).json({ message: "Error submitting solution", error: error.message });
  }
};

module.exports = {
  addContest,
  editContest,
  deleteContest,
  getContest,
  startContestRound,
  updateMatchWinner,
  getContestById,
  addProblemToContest, 
  getContestProblems,
  getRandomContestProblem,
  submitMatchSolution,
  getUserMatchInfo,
  removeProblemFromContest
};
