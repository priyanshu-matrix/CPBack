const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./DB'); // Import the database connection function


// Initialize App

const http = require('http');
const socketWrapper = require('./socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server                                
socketWrapper.initialize(server);


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const userRoutes = require('./routes/userRoutes');
const contestRoutes = require('./routes/contestRoutes');

app.use('/api/users', userRoutes);
app.use('/api/contests', contestRoutes);

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
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 