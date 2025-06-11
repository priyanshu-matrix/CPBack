const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        set: function(value) {
            return Buffer.from(value).toString('base64');
        },
        get: function(value) {
            return Buffer.from(value, 'base64').toString();
        }
    },
    description: {
        type: String,
        required: true,
        set: function(value) {
            return Buffer.from(value).toString('base64');
        },
        get: function(value) {
            return Buffer.from(value, 'base64').toString();
        }
    },
    inputFormat: {
        type: String,
        required: true,
        set: function(value) {
            return Buffer.from(value).toString('base64');
        },
        get: function(value) {
            return Buffer.from(value, 'base64').toString();
        }
    },
    outputFormat: {
        type: String,
        required: true,
        set: function(value) {
            return Buffer.from(value).toString('base64');
        },
        get: function(value) {
            return Buffer.from(value, 'base64').toString();
        }
    },
    examples: [
        {
            input: {
                type: String,
                required: true,
                set: function(value) {
                    return Buffer.from(value).toString('base64');
                },
                get: function(value) {
                    return Buffer.from(value, 'base64').toString();
                }
            },
            output: {
                type: String,
                required: true,
                set: function(value) {
                    return Buffer.from(value).toString('base64');
                },
                get: function(value) {
                    return Buffer.from(value, 'base64').toString();
                }
            },
            explanation: {
                type: String,
                required: true,
                set: function(value) {
                    return Buffer.from(value).toString('base64');
                },
                get: function(value) {
                    return Buffer.from(value, 'base64').toString();
                }
            }
        }
    ],
    constraints: {
        type: [{
            type: String,
            required: true,
            set: function(value) {
                return Buffer.from(value).toString('base64');
            },
            get: function(value) {
                return Buffer.from(value, 'base64').toString();
            }
        }],
        required: true
    },
    timeLimit: {
        type: Number,
        required: true
    }, // in seconds
    memoryLimit: {
        type: Number,
        required: true
    }, // in MB
    tags: {
        type: [{
            type: String,
            set: function(value) {
                return Buffer.from(value).toString('base64');
            },
            get: function(value) {
                return Buffer.from(value, 'base64').toString();
            }
        }],
    }, // e.g., ['math', 'dp']
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Easy',
        required: true
    },
    points : {
        type: Number,
        required: true,
        default: 0
    },
});

module.exports = mongoose.model('Problem', problemSchema);