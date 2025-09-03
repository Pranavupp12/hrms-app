const cron = require('node-cron');
const Employee = require('../models/Employee');

const markAbsentees = async () => {
  console.log('Running daily job to mark absentees...');
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayString = yesterday.toISOString().slice(0, 10);

  try {
    // This is an efficient way to find only the employees who missed punching in.
    const employeesWithoutYesterdayAttendance = await Employee.find({
      'attendance.date': { $ne: yesterdayString }
    });

    if (employeesWithoutYesterdayAttendance.length === 0) {
      console.log(`No absentees to mark for ${yesterdayString}.`);
      return;
    }

    // Prepare a list of updates to be executed in a single database command.
    const bulkOps = employeesWithoutYesterdayAttendance.map(employee => ({
      updateOne: {
        filter: { _id: employee._id },
        update: {
          $push: {
            attendance: {
              date: yesterdayString,
              checkIn: '--',
              checkOut: '--',
              status: 'Absent'
            }
          }
        }
      }
    }));

    // Execute all the updates at once for better performance.
    await Employee.bulkWrite(bulkOps);
    console.log(`Successfully marked ${bulkOps.length} employees as absent for ${yesterdayString}.`);

  } catch (error) {
    console.error('Error in cron job while marking absentees:', error);
  }
};

/**
 * Schedules the attendance job to run every day at 1:00 AM India Standard Time.
 * The cron string '0 1 * * *' means: at minute 0 of hour 1, every day, every month, every day of the week.
 */
const scheduleAttendanceJob = () => {
  cron.schedule('0 1 * * *', markAbsentees, {
    timezone: "Asia/Kolkata"
  });
  console.log('Scheduled cron job to mark absentees daily at 1:00 AM IST.');
};

module.exports = { scheduleAttendanceJob };