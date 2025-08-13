const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

let rooms = {}; 
// Structure: { roomId: { question: '', options: [], votes: {}, timer: null, messages: [] } }

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Teacher creates a room
    socket.on('createRoom', (callback) => {
        const roomId = uuidv4().slice(0, 6); // short room ID
        rooms[roomId] = { question: '', options: [], votes: {}, timer: null, messages: [] }; // Add messages array to each room
        callback(roomId);
    });

    // Join room (teacher or student)
    socket.on('joinRoom', ({ roomId, name, role }) => {
        if (!rooms[roomId]) return socket.emit('error', 'Room not found');

        socket.join(roomId);
        socket.data = { name, roomId, role };

        console.log(`Joined room ${roomId} as ${role}, name: ${name}`);

        // If student joins after question is published, send it immediately
        if (role === 'student' && rooms[roomId].question) {
            socket.emit('newQuestion', {
                question: rooms[roomId].question,
                options: rooms[roomId].options,
                time: getRemainingTime(rooms[roomId])
            });
        }

        // Send previous chat messages to new participant
        socket.emit('chatMessages', rooms[roomId].messages);
        
        // Broadcast to other participants that a new user has joined
        socket.broadcast.to(roomId).emit('newParticipant', { name });
    });

    // Teacher publishes a question
    socket.on('publishQuestion', ({ roomId, question, options }) => {
        if (!rooms[roomId]) return;

        // Reset room for new question
        rooms[roomId].question = question;
        rooms[roomId].options = options;
        rooms[roomId].votes = {};

        // Clear any existing timer
        if (rooms[roomId].timer) clearTimeout(rooms[roomId].timer);

        // Emit new question to everyone in room
        io.to(roomId).emit('newQuestion', { question, options, time: 60 });

        // Start 60s timer to send final results
        rooms[roomId].timer = setTimeout(() => {
            const results = calculateResults(rooms[roomId]);
            io.to(roomId).emit('pollResults', results);
        }, 60000);

        console.log(`Question published in room ${roomId}: ${question}`);
    });

    // Student submits vote
    socket.on('submitVote', ({ selectedOption, roomId, name }) => {
        if (!roomId || !rooms[roomId] || selectedOption == null) return;

        // Record vote
        rooms[roomId].votes[name] = selectedOption;

        // Send live poll update
        const results = calculateResults(rooms[roomId]);
        io.to(roomId).emit('pollUpdate', results);

        console.log(`Vote recorded: ${name} -> option ${selectedOption}`);
    });

    // Chat functionality: Send message
    socket.on('sendMessage', ({ message, roomId, sender }) => {
        if (!rooms[roomId]) return;

        // Save the message in the room
        const newMessage = { sender, text: message };
        rooms[roomId].messages.push(newMessage);

        // Broadcast the message to all participants in the room
        io.to(roomId).emit('receiveMessage', newMessage);

        console.log(`Message sent in room ${roomId}: ${message}`);
    });

    // socket.on('disconnect', () => {
    //     console.log('Disconnected:', socket.id);
    // });
});

// Helper: Count votes for each option
function calculateResults(room) {
    const counts = Array(room.options.length).fill(0);
    Object.values(room.votes).forEach(opt => {
        if (typeof opt === 'number' && opt >= 0 && opt < counts.length) {
            counts[opt]++;
        }
    });
    return counts;
}

// Helper: calculate remaining time (optional)
function getRemainingTime(room) {
    if (!room.timer) return 60;
    // This can be improved to calculate exact remaining seconds
    return 60;
}

server.listen(3000, () => console.log('Server running on port 3000'));
