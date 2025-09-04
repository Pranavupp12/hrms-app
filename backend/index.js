const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const { scheduleAttendanceJob } = require('./cron/attendanceMarker');



const employeeRoutes = require('./routes/employeeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hrRoutes = require('./routes/hrRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

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

// Schedule the absent marking job
scheduleAttendanceJob();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});