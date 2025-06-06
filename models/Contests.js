const mongoose = require("mongoose");

const matchSubSchema = new mongoose.Schema(
    {
        matchId: {
            type: String,
            required: true,
        },
        user1: {
            type: String,
            required: true,
        },
        user2: {
            type: String,
            default: "Bye", // Default to "Bye" if no second user
        },
        winner: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "completed"],
            default: "pending",
        },
    },
    { _id: false }
);

const contestSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    duration: {
        type: String,
        required: true,
    },
    problems: {
        type: Number,
        required: true,
    },
    level: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    registeredUsers: {
        type: [String],
        default: [],
    },
    matches: {
    type: Map,
    of: [matchSubSchema], // Single array instead of nested arrays
    default: {},
},

    currentRound: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Contest", contestSchema);
