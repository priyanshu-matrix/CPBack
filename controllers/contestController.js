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

module.exports = {
    addContest,
    editContest,
    deleteContest,
    getContest
};
    