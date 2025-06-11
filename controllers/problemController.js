const Problem = require('../models/Problems'); // Corrected path
const User = require('../models/User'); // Corrected path
const Contest = require('../models/Contests'); // Corrected path

// Create a new problem
const createProblem = async (req, res) => {
    try {
        const { title } = req.body;
        
        // Check if a problem with the same title already exists
        const existingProblem = await Problem.findOne({ title });
        if (existingProblem ) {
            return res.status(400).json({ error: 'Problem already exists' });
        }
        
        const problem = new Problem(req.body);
        await problem.save();
        res.status(201).json({ message: 'Problem created successfully', problem });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Edit an existing problem
const editProblem = async (req, res) => {
    try {
        const { id } = req.body;
        const problem = await Problem.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }
        res.status(200).json({ message: 'Problem updated successfully', problem });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a problem
const deleteProblem = async (req, res) => {
    try {
        const { id } = req.body;
        const problem = await Problem.findByIdAndDelete(id);
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }
        res.status(200).json({ message: 'Problem deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Add a problem to a contest
const addProblemToContest = async (req, res) => {
    try {
        const { contestId, problemId } = req.body;
        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ error: 'Contest not found' });
        }
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }
        if (contest.problems.includes(problemId)) {
            return res.status(400).json({ error: 'Problem already exists in the contest' });
        }
        contest.problems.push(problemId);
        await contest.save();
        res.status(200).json({ message: 'Problem added to contest successfully', contest });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
// Get a problem by ID
const getProblemById = async (req, res) => {
    try {
        const { id } = req.body;
        const problem = await Problem.findById(id);
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }
        res.status(200).json({ problem });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all problems
const getAllProblems = async (req, res) => {
    try {
        const problems = await Problem.find();
        res.status(200).json({ problems });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createProblem,
    editProblem,
    deleteProblem,
    addProblemToContest,
    getProblemById,
    getAllProblems
};
