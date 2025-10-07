require('dotenv').config();
const mongoose = require('mongoose');
const { markAbsentees } = require('./cron/attendanceMarker');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Database connected.');

    await markAbsentees();
  } catch (error) {
    console.error('Error running manual job:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
};

run();

//function to mark absentees manually without cron job
// Usage: node run-absentee-job.js