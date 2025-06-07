const Contest = require("../models/Contests");
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
        throw new Error(`Cannot create matches for round ${round}: Round exceeds the limit of ${limit} rounds.`);
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
    const matches = await createMatches(ContestID, currentRound, contestData);

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

module.exports = {
  addContest,
  editContest,
  deleteContest,
  getContest,
  startContestRound,
  updateMatchWinner,
  getContestById,
};
