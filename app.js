const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./DB'); // Import the database connection function


// Initialize App

const http = require('http');
const socketWrapper = require('./socket');

const app = express();



// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Add payload limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);

// Initialize Socket.IO with the HTTP server                                
const server = http.createServer(app);
socketWrapper.initialize(server);

// Routes
const userRoutes = require('./routes/userRoutes');
const contestRoutes = require('./routes/contestRoutes');
const compilerRoutes = require('./routes/compilerRoutes');
const problemRoutes = require('./routes/problemRoutes'); // Ensure this path is correct

app.use('/api/users', userRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/compiler', compilerRoutes);
app.use('/api/problems', problemRoutes); // Ensure this path is correct

// Connect to MongoDB
connectDB();

// Basic route
app.get('/', (_req, res) => {
    res.send('API is running');
});

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


// Start server
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
}); 