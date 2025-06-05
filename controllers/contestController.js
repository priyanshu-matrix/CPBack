const Contest = require("../models/Contests");
const mongoose = require('mongoose'); // Import mongoose

// Add a new contest
const addContest = async (req, res) => {
    try {
        const newContest = new Contest(req.body);
        await newContest.save();
        res.status(201).json({ message: "Contest added successfully", contest: newContest });
    } catch (error) {
        res.status(500).json({ message: "Error adding contest", error: error.message });
    }
};

// Edit an existing contest
const editContest = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedContest = await Contest.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedContest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        res.status(200).json({ message: "Contest updated successfully", contest: updatedContest });
    } catch (error) {
        res.status(500).json({ message: "Error updating contest", error: error.message });
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
        await mongoose.model('User').updateMany(
            { 'registeredContests.contestId': id },
            { $pull: { registeredContests: { contestId: id } } }
        );

        res.status(200).json({ message: "Contest deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting contest", error: error.message });
    }
};

// Get all contests
const getContest = async (_req, res) => {
    try {
        const contests = await Contest.find();
        res.status(200).json({ contests });
    } catch (error) {
        res.status(500).json({ message: "Error fetching contests", error: error.message });
    }
};

async function createMatches(ContestID, round) {
    try {
        const contestdata = await Contest.find(id = ContestID);
        let usersList = [];

        if (round == 1) {
            const users = contestdata.registeredUsers;
            usersList = [...users];
        } else {
            const prevMatches = contestdata.matches.get(round - 1);

            for (const match of prevMatches) {
                if (match.winner == match.user1) {
                    usersList.push(match.user1);
                }
                else if (match.winner == match.user2) {
                    usersList.push(match.user2);
                }
            }
        }

        usersList.sort(() => Math.random() - 0.5); // Shuffle the users list

        const n = users.length;
        const k = Math.log2(n) + 1;
        const byes = (2 ** k) - n;

        const matches = [];
        for (let i = 0; i < n - byes; i += 2) {
            matches.push({
                matchId: `${contestdata.id}-${matches.length + 1}`,
                user1: usersList[i],
                user2: usersList[i + 1]
            });
        }
        if (byes > 0) {
            for (let i = n - byes; i < n; i++) {
                matches.push({
                    matchId: `${contestdata.id}-${matches.length + 1}`,
                    user1: usersList[i],
                    user2: null, // Bye,
                    winner: usersList[i], // Automatically assign the user as the winner
                    status: "completed"
                });
            }
        }

        console.log("Matches created for contest:", contestdata.id, "Round:", round, "Matches:", matches.length);
        contestdata.matches[round] = matches;
        await contestdata.save();

        return matches;

    } catch (error) {
        res.status(500).json({ message: "Error fetching tour", error: error.message });
    }
};



const startContestRound = async (req, res) => {
    try {
        const { id } = req.params;
        const contest = await Contest.findById(id);
        if (!contestData) {
            return res.status(404).json({ message: "Contest not found" });
        }

        let round = contestData.currentRound;

        if (round > 1) {
            // Check if previous round is finished or not
            const previousRoundMatches = contestData.matches.get(round - 1);
            if (!previousRoundMatches || previousRoundMatches.some(match => match.status !== "completed")) {
                return res.status(400).json({ message: "Previous round is not completed yet" });
            }
        }

        round++;
        contestData.currentRound = round;

        // Check if matches are already created
        if (contestData.matches.length > 0) {
            return res.status(400).json({ message: "Matches already created for this contest" });
        }

        // Create matches
        const matches = await createMatches(id, round);

        res.status(200).json({
            message: "Contest started successfully",
            matches: matches,
            round: round
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error starting contest", error: error.message });
    }
};

module.exports = {
    addContest,
    editContest,
    deleteContest,
    getContest,
    startContestRound,
};
