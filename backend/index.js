const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const { scheduleAttendanceJob } = require('./cron/attendanceMarker');
const { Server } = require("socket.io");
const http = require('http');



const employeeRoutes = require('./routes/employeeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hrRoutes = require('./routes/hrRoutes');
const authRoutes = require('./routes/authRoutes');
const detailsRoutes = require('./routes/detailsRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin:  ["http://localhost:5173", "http://192.168.1.67:5173"], // Your frontend URL
    methods: ["GET", "POST"]
  }
});

// Make the `io` instance available to all your routes/controllers
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Allow users to join a room based on their own user ID
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Connect to MongoDB with async/await and try-catch
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

connectDB();

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/details', detailsRoutes);
app.use('/api/events', eventRoutes);

// this line to serve the 'slips' folder as static files
app.use('/slips', express.static('slips'));

// Schedule the absent marking job
scheduleAttendanceJob(io);

// It starts the server that handles BOTH Express and Socket.IO
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server with API and WebSockets running on port ${PORT}`);
});