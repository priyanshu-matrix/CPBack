// socket.js
const { Server } = require('socket.io');
let io = null;

module.exports = {
    initialize: (server) => {
        io = new Server(server, {
            cors: { origin: '*' }
        });
        // Register connection handler  
        io.on('connection', (socket) => {
            console.log('New client connected:', socket.id);
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
