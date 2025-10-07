const cron = require('node-cron');
const Employee = require('../models/Employee');

const markAbsentees = async () => {
  console.log('Running daily job to mark absentees at 11 AM...');
  
  const todayString = new Date().toISOString().slice(0, 10);

  try {
    // Find all employees who do NOT have an attendance record for today
    const employeesWithoutTodayAttendance = await Employee.find({
      'attendance.date': { $ne: todayString }
    });

    if (employeesWithoutTodayAttendance.length === 0) {
      console.log(`All employees have punched in for ${todayString}.`);
      return;
    }

    // Prepare the bulk update operation
    const bulkOps = employeesWithoutTodayAttendance.map(employee => ({
      updateOne: {
        filter: { _id: employee._id },
        update: {
          $push: {
            attendance: {
              date: todayString,
              checkIn: '--',
              checkOut: '--',
              status: 'Absent'
            }
          }
        }
      }
    }));

    // Execute the bulk update
    await Employee.bulkWrite(bulkOps);
    console.log(`Successfully marked ${bulkOps.length} employees as absent for ${todayString}.`);

  } catch (error) {
    console.error('Error in cron job while marking absentees:', error);
  }
};

/**
 * Schedules the attendance job to run every day at 11:00 AM India Standard Time.
 * The cron string '0 11 * * *' means: at minute 0 of hour 11, every day.
 */
const scheduleAttendanceJob = () => {
  cron.schedule('0 11 * * *', markAbsentees, {
    timezone: "Asia/Kolkata"
  });
  console.log('Scheduled cron job to mark absentees daily at 11:00 AM IST.');
};

module.exports = { scheduleAttendanceJob, markAbsentees };