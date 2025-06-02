const User = require('../models/User');


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

const login = async (req, res) => {
    const { uid } = req.user;

    let user = await User.findOne({ uid });
    if (!user) {
        return res.status(401).json({ message: 'User not registered in the system' });
    }

    res.json({ message: 'Login successful', isAdmin: user.isAdmin });
};

const signup = async (req, res) => {
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
};

const adminDashboard = async (req, res) => {
    res.send('Welcome to Admin Dashboard');
};

const userInfo = async (req, res) => {
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
};

module.exports = {
    login,
    signup,
    adminDashboard,
    userInfo,
    checkAdmin
};