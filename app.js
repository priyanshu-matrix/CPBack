const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./DB'); // Import the database connection function

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const userRoutes = require('./routes/user');
app.use('/api/users', userRoutes);

// Connect to MongoDB
connectDB();

// Basic route
app.get('/', (_req, res) => {
    res.send('API is running');
});

// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});