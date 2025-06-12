const mongoose = require('mongoose');

const TestCaseSchema = new mongoose.Schema({
    input: {
        type: String,
        required: true
    },
    output: {
        type: String,
        required: true
    },
    isSample: {
        type: Boolean,
        default: false
    }
});

const ProblemSchema = new mongoose.Schema({
    problemId: {
        type: String,
        required: true,
        unique: true // Recommended: Ensures one set of test cases per problemId
    },
    testCases: [TestCaseSchema]
});

const TestCasesModel = mongoose.model('TestCases', ProblemSchema);

module.exports = TestCasesModel;