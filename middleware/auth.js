// middleware/auth.js
const admin = require('../firebase');

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

module.exports = verifyToken;