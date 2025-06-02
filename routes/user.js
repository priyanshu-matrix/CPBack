// routes/user.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const User = require('../models/User');

router.post('/login', verifyToken, async (req, res) => {
    const { uid } = req.user;

    let user = await User.findOne({ uid });
    if (!user) {
        return res.status(401).json({ message: 'User not registered in the system' });
    }

    res.json({ message: 'Login successful', isAdmin: user.isAdmin });
});

router.post('/signup', verifyToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User information missing' });
    }

    const { uid, email, name } = req.body;
    const firebaseUid = req.user.uid;

    if (uid !== firebaseUid) {
        return res.status(403).json({ message: 'Unauthorized: UID mismatch' });
    }

    let user = await User.findOne({ uid });
    if (!user) {
        user = new User({ uid, email, name, isAdmin: false }); // default to user
        await user.save();
    } else {
        // Update the user's name if it's different
        if (user.name !== name) {
            user.name = name;
            await user.save();
        }
    }

    res.json({ message: 'User synced', isAdmin: user.isAdmin });
});

router.get('/admin/dashboard', verifyToken, async (req, res) => {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.isAdmin) return res.status(403).send('Access denied');

    res.send('Welcome to Admin Dashboard');
});

router.get('/info', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

// Registration is handled in the login route. If a user doesn't exist, they are created.
// No separate signup route needed.