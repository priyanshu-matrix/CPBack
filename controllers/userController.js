const User = require("../models/User");
const Contest = require("../models/Contests");

const checkAdmin = (req, res, next) => {
    User.findOne({ uid: req.user.uid })
        .then((user) => {
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (!user.isAdmin) {
                return res.status(403).json({ message: "Unauthorized: Not an admin" });
            }
            next();
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        });
};

const login = async (req, res) => {
    const { uid } = req.user;

    let user = await User.findOne({ uid });
    if (!user) {
        return res
            .status(401)
            .json({ message: "User not registered in the system" });
    }

    res.json({ message: "Login successful", isAdmin: user.isAdmin });
};

const signup = async (req, res) => {
    if (!req.user) {
        return res
            .status(401)
            .json({ message: "Unauthorized: User information missing" });
    }

    const { uid, email, name } = req.body;
    const firebaseUid = req.user.uid;

    if (uid !== firebaseUid) {
        return res.status(403).json({ message: "Unauthorized: UID mismatch" });
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

    res.json({ message: "User synced", isAdmin: user.isAdmin });
};

const adminDashboard = async (_req, res) => {
    res.send("Welcome to Admin Dashboard");
};

const userInfo = async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const fetchAllUsers = async (_req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const registerContest = async (req, res) => {
    const { uid } = req.user;
    const { contestId } = req.body;

    try {
        const user = await User.findOne({ uid });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user is already registered for the contest
        const alreadyRegistered = user.registeredContests.some(
            (reg) => reg.contestId.toString() === contestId
        );

        if (alreadyRegistered) {
            return res
                .status(400)
                .json({ message: "User already registered for this contest" });
        }

        // Register the user for the contest
        user.registeredContests.push({ contestId });
        await user.save();

        // Add the user to the contest's registered users
        const contest = await Contest.findById(contestId);

        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }

        if (!contest.registeredUsers.includes(uid)) {
            contest.registeredUsers.push(uid);
            await contest.save();
        }

        res.json({ message: "User registered for contest successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const checkContestRegistration = async (req, res) => {
    const { uid } = req.user;
    const { contestId } = req.params;

    try {
        const user = await User.findOne({ uid });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user is already registered for the contest
        const alreadyRegistered = user.registeredContests.some(
            (reg) => reg.contestId.toString() === contestId
        );

        if (alreadyRegistered) {
            return res.json({ registered: true });
        } else {
            return res.json({ registered: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const changeUserStatus = async (req, res) => {
    const { uid, contestId, contestStatus } = req.body;

    try {
        // Find the user to update
        const user = await User.findOne({ uid });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update contest status if contestId and contestStatus are provided
        if (contestId && contestStatus) {
            const contestRegistration = user.registeredContests.find(
                (contest) => contest.contestId.toString() === contestId
            );

            if (!contestRegistration) {
                return res
                    .status(404)
                    .json({ message: "Contest registration not found for this user" });
            }

            // Validate that status is one of the allowed values
            if (!["primary", "semi-finalists", "finalists"].includes(contestStatus)) {
                return res.status(400).json({ message: "Invalid contest status" });
            }

            contestRegistration.status = contestStatus;
        }

        await user.save();

        res.json({
            message: "User status updated successfully",
            user: {
                uid: user.uid,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                registeredContests: user.registeredContests,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const searchMatch = async (req, res) => {
    const { uid, contestId } = req.body;

    try {
        const user = await User.findOne({ uid });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const contestData = await Contest.findById(contestId);

        if (!contestData) {
            return res.status(404).json({ message: "Contest not found" });
        }

        const round = contestData.round;

        const matches = contestData.matches[round] || [];
        const userMatch = matches.find(
            (match) => match.user1 === uid || match.user2 === uid
        );
        if (!userMatch) {
            return res
                .status(404)
                .json({ message: "No match found for the user in this contest" });
        }
        res.json({
            message: "Match found",
            match: userMatch,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    login,
    signup,
    adminDashboard,
    userInfo,
    checkAdmin,
    fetchAllUsers,
    registerContest,
    checkContestRegistration,
    changeUserStatus,
    searchMatch
};
