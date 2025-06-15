const TestCases = require('../models/TestCases'); // Import TestCases model
const JSZip = require('jszip'); // Import jszip
const fs = require('fs'); // Import fs
const path = require('path'); // Import path
const Problem = require('../models/Problems'); // Import Problem model
const User = require('../models/User'); // Import User model
const Contest = require('../models/Contests'); // Import Contest model

// Delete testcase function
const deleteTestcase = async (req, res) => {
    try {
        const { problemId } = req.body;
        
        const result = await TestCases.deleteMany({ problemId: problemId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No testcases found for this problem' });
        }
        
        res.status(200).json({ 
            message: 'Testcases deleted successfully', 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting testcases', error: error.message });
    }
};



module.exports = {
    deleteTestcase
};