const Problem = require('../models/Problems'); // Corrected path
const User = require('../models/User'); // Corrected path
const Contest = require('../models/Contests'); // Corrected path
const TestCasesModel = require('../models/TestCases'); // Added import for TestCasesModel
const JSZip = require('jszip'); // Added import for jszip
const fs = require('fs'); // Added import for fs
const path = require('path'); // Added import for path

// Create a new problem
const createProblem = async (req, res) => {
    try {
        const { title } = req.body;
        
        // Check if a problem with the same title already exists
        const existingProblem = await Problem.findOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } });
        if (existingProblem) {
            return res.status(400).json({ error: 'Problem already exists' });
        }

        // Parse JSON fields properly
        let examples = req.body.examples;
        let constraints = req.body.constraints;
        let tags = req.body.tags;

        // Debug logs to see what we're receiving
        console.log('Raw examples:', examples, typeof examples);
        console.log('Raw constraints:', constraints, typeof constraints);
        console.log('Raw tags:', tags, typeof tags);

        // Parse if they're strings
        if (typeof examples === 'string') {
            try {
                examples = JSON.parse(examples);
            } catch (e) {
                console.error('Error parsing examples:', e);
                examples = [];
            }
        }

        if (typeof constraints === 'string') {
            try {
                constraints = JSON.parse(constraints);
            } catch (e) {
                console.error('Error parsing constraints:', e);
                constraints = [];
            }
        }

        if (typeof tags === 'string') {
            try {
                tags = JSON.parse(tags);
            } catch (e) {
                console.error('Error parsing tags:', e);
                tags = [];
            }
        }

        // Ensure they are arrays
        examples = Array.isArray(examples) ? examples : [];
        constraints = Array.isArray(constraints) ? constraints : [];
        tags = Array.isArray(tags) ? tags : [];

        // Debug logs to see parsed values
        console.log('Parsed examples:', examples);
        console.log('Parsed constraints:', constraints);
        console.log('Parsed tags:', tags);

        const problemData = {
            title: req.body.title,
            description: req.body.description,
            difficulty: req.body.difficulty,
            inputFormat: req.body.inputFormat || '',
            outputFormat: req.body.outputFormat || '',
            timeLimit: parseInt(req.body.timeLimit) || 1,
            memoryLimit: parseInt(req.body.memoryLimit) || 256,
            points: parseInt(req.body.points) || 100,
            examples: examples,
            constraints: constraints,
            tags: tags
        };

        console.log('Final problem data before save:', problemData);

        const problem = new Problem(problemData);
        await problem.save();

        if (req.file) {
            const zip = new JSZip();
            const data = await zip.loadAsync(req.file.buffer);
            const files = data.files;
            const testCases = [];
            const inputFiles = {};
            const outputFiles = {};

            for (const fileName in files) {
                if (!files[fileName].dir) {
                    const fileData = await files[fileName].async('string');
                    if (fileName.startsWith('input') && fileName.endsWith('.txt')) {
                        const match = fileName.match(/input(\d+)\.txt/);
                        if (match) {
                            inputFiles[match[1]] = fileData;
                        }
                    } else if (fileName.startsWith('output') && fileName.endsWith('.txt')) {
                        const match = fileName.match(/output(\d+)\.txt/);
                        if (match) {
                            outputFiles[match[1]] = fileData;
                        }
                    }
                }
            }

            for (const numeral in inputFiles) {
                if (outputFiles[numeral]) {
                    testCases.push({
                        input: inputFiles[numeral],
                        output: outputFiles[numeral],
                        isSample: false // Or determine this based on filename or other logic
                    });
                }
            }

            if (testCases.length > 0) {
                const problemTestCases = new TestCasesModel({
                    problemId: problem._id.toString(), // Use the actual problem ID
                    testCases: testCases
                });
                await problemTestCases.save();
            }
        }

        res.status(201).json({ message: 'Problem created successfully', problem });
    } catch (error) {
        console.error('Error creating problem:', error);
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
