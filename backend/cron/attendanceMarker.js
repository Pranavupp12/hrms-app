const cron = require('node-cron');
const Employee = require('../models/Employee'); // Adjust path as needed

/**
 * This job runs daily.
 * 1. On Sunday (day 0), it marks everyone "Present" (Weekly Off) who isn't already marked.
 * 2. On Mon-Sat (days 1-6), it marks everyone "Absent" who hasn't punched in.
 */
const markAttendance = async (io) => {
  // Get the current date and day *in India*
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const todayString = now.toISOString().slice(0, 10);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const isSunday = dayOfWeek === 0;
  const statusToMark = isSunday ? 'Present' : 'Absent';
  const logMessage = isSunday ? 'Weekly Off (Present)' : 'Absent';

  try {
    // Find all employees who do NOT have an attendance record for today
    // This query is the same for both Sunday and Weekdays
    const employeesToMark = await Employee.find({
      'attendance.date': { $ne: todayString }
    });

    if (employeesToMark.length === 0) {
      console.log(`All employees already have an attendance record for ${todayString}.`);
      return;
    }

    // Prepare the bulk update operation
    const bulkOps = employeesToMark.map(employee => ({
      updateOne: {
        filter: { _id: employee._id },
        update: {
          $push: {
            attendance: {
              date: todayString,
              checkIn: '--',
              checkOut: '--',
              status: statusToMark // Use the correct status ('Present' or 'Absent')
            }
          }
        }
      }
    }));

    // Execute the bulk update
    await Employee.bulkWrite(bulkOps);
    console.log(`Successfully marked ${bulkOps.length} employees as ${logMessage} for ${todayString}.`);

    // Emit a generic update event
    // We can emit this regardless of the day
    if (io) {
      io.emit('absentees_marked', { count: bulkOps.length, status: logMessage });
    }

  } catch (error) {
    console.error('Error in cron job while marking attendance:', error);
  }
};

/**
 * Schedules the attendance job to run every day at 11:00 AM India Standard Time.
 */
const scheduleAttendanceJob = (io) => {
  // Runs at 11:00 AM, every day
  cron.schedule('0 11 * * *', () => {
    console.log('Running daily attendance job (11:00 AM IST)...');
    markAttendance(io);
  }, {
    timezone: "Asia/Kolkata"
  });
  console.log('Scheduled cron job to mark attendance daily at 11:00 AM IST.');
};

module.exports = { scheduleAttendanceJob, markAttendance };