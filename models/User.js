// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: String, // Firebase UID
  email: String,
  name: String,
  isAdmin: { type: Boolean, default: false }, // Set manually
  registeredContests: [{
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest'
    },
    status: {
      type: String,
      enum: ['primary', 'semi-finalists', 'finalists'],
      default: 'primary'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  solvedProblems: [{
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem'
    },
    solvedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

module.exports = mongoose.model('User', userSchema);