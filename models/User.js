// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: String, // Firebase UID
  email: String,
  name: String,
  isAdmin: { type: Boolean, default: false }, // Set manually
});

module.exports = mongoose.model('User', userSchema);