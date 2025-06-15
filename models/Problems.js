const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, required: true },
    inputFormat: { type: String, default: '' },
    outputFormat: { type: String, default: '' },
    examples: [{ 
        input: String,
        output: String,
        explanation: String
    }],
    constraints: [String], // Array of strings
    tags: [String], // Array of strings
    timeLimit: { type: Number, default: 1 },
    memoryLimit: { type: Number, default: 256 },
    points: { type: Number, default: 100 }
});

module.exports = mongoose.model('Problem', problemSchema);
