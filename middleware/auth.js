// middleware/auth.js
const admin = require('../firebase');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('No token provided');

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // contains uid, email, etc.
    next();
  } catch (error) {
    return res.status(403).send('Invalid token');
  }
};

const checkAdmin = (req, res, next) => {
    User.findOne({ uid: req.user.uid })
        .then(user => {
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (!user.isAdmin) {
                return res.status(403).json({ message: 'Unauthorized: Not an admin' });
            }
            next();
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        });
};

module.exports = {verifyToken, checkAdmin};