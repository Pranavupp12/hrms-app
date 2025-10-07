// backend/controllers/hrController.js

const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const SentNotification = require('../models/SentNotification');

// Fetch all employees
exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().select('-password');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employees' });
    }
};

// Add a new employee
exports.addEmployee = async (req, res) => {
    const { name, email, password, role, baseSalary } = req.body;
    try {
        const newEmployeeData = {
            name,
            email,
            password,
            role: role || 'Employee',
            filePath: req.file ? req.file.path : null,
            fileName: req.file ? req.file.originalname : null,
            baseSalary
        };
        const newEmployee = new Employee(newEmployeeData);
        await newEmployee.save();
        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).json({ message: 'Error adding employee' });
    }
};

// Get notifications for the logged-in HR
exports.getHrNotifications = async (req, res) => {
    try {
        const hr = await Employee.findById(req.params.id).populate('notifications.sentBy', 'name role');
        if (!hr) return res.status(404).json({ message: 'HR not found' });
        res.json(hr.notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching HR notifications' });
    }
};

// Mark a notification as read for the logged-in HR
exports.markNotificationAsRead = async (req, res) => {
    try {
        const hr = await Employee.findById(req.params.id);
        if (!hr) return res.status(404).json({ message: 'HR not found' });

        const notification = hr.notifications.id(req.params.notificationId);
        if (notification) {
            notification.status = 'read';
            await hr.save();
            res.json(notification);
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
};

// Fetch sent notifications history
exports.getSentNotifications = async (req, res) => {
    try {
        const notifications = await SentNotification.find().populate('sentBy', 'name role');
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sent notifications' });
    }
};

// Send a notification
exports.sendNotification = async (req, res) => {
    const { recipient, message, senderId } = req.body; // Add senderId
    const newNotification = {
        message,
        date: new Date().toISOString().slice(0, 10),
        status: 'unread',
        sentBy: senderId 
    };

    try {
        let recipientNames = [];

        if (recipient === 'all') {
            await Employee.updateMany({}, { $push: { notifications: newNotification } });
            recipientNames.push('All Employees');
        } else if (Array.isArray(recipient) && recipient.length > 0) {
            const areIdsValid = recipient.every(id => mongoose.Types.ObjectId.isValid(id));
            if (!areIdsValid) {
                return res.status(400).json({ message: 'Invalid recipient ID provided.' });
            }

            const employees = await Employee.find({ '_id': { $in: recipient } }).select('name');
            if (employees.length !== recipient.length) {
                return res.status(404).json({ message: 'One or more recipient employees not found.' });
            }

            await Employee.updateMany(
                { '_id': { $in: recipient } },
                { $push: { notifications: newNotification } }
            );
            recipientNames = employees.map(emp => emp.name);

        } else {
            return res.status(400).json({ message: 'A recipient is required.' });
        }

        const sentNotification = new SentNotification({
            date: newNotification.date,
            message,
            recipient: recipientNames.join(', '),
            sentBy: senderId // Save the sender's ID
        });

        await sentNotification.save();
        res.status(201).json(sentNotification);
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ message: 'Error sending notification' });
    }
};

// Get all attendance records for ALL users
exports.getAllAttendance = async (req, res) => {
    try {
        const users = await Employee.find({}).select('name attendance role');
        const allAttendance = users.flatMap(user => 
            user.attendance.map(att => ({
                employeeName: user.name,
                role: user.role,
                ...att.toObject()
            }))
        );
        res.json(allAttendance.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
};

// Get personal attendance for the logged-in HR
exports.getHrAttendance = async (req, res) => {
    try {
        const hr = await Employee.findById(req.params.id).select('attendance');
        if (!hr) return res.status(404).json({ message: 'HR not found' });
        res.json(hr.attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching HR attendance' });
    }
};

// Punch In for HR
exports.hrPunchIn = async (req, res) => {
    try {

        const now = new Date();
        const currentHour = now.getHours();
        
        if (currentHour < 9 || currentHour >= 11) {
            return res.status(400).json({ message: 'Punch-in is only allowed between 9 AM and 11 AM.' });
        }

        const hr = await Employee.findById(req.params.id);
        if (!hr) return res.status(404).json({ message: 'HR not found' });

        const today = new Date().toISOString().slice(0, 10);
        const alreadyPunchedIn = hr.attendance.some(att => att.date === today);

        if (alreadyPunchedIn) {
            return res.status(400).json({ message: 'Already punched in for today' });
        }

        const newAttendance = {
            date: today,
            checkIn: new Date().toLocaleTimeString('en-IN', { hour12: false }),
            checkOut: '',
            status: 'Present'
        };

        hr.attendance.push(newAttendance);
        await hr.save();
        res.status(201).json(hr.attendance);

    } catch (error) {
        res.status(500).json({ message: 'Error punching in' });
    }
};

// Punch Out for HR
// backend/controllers/hrController.js
exports.hrPunchOut = async (req, res) => {
    try {
        const hr = await Employee.findById(req.params.id);
        if (!hr) return res.status(404).json({ message: 'HR not found' });

        const today = new Date().toISOString().slice(0, 10);
        
        const attendanceRecord = hr.attendance.find(att => 
            att.date === today && 
            att.checkIn && att.checkIn !== '--' && 
            (!att.checkOut || att.checkOut === '--' || att.checkOut === '')
        );

        if (!attendanceRecord) {
            return res.status(400).json({ message: 'Cannot punch out without punching in first' });
        }

        attendanceRecord.checkOut = new Date().toLocaleTimeString('en-IN', { hour12: false });
        await hr.save();
        res.status(200).json(hr.attendance);

    } catch (error) {
        res.status(500).json({ message: 'Error punching out' });
    }
};

// Get a complete attendance status for all users for today
exports.getTodaysAttendance = async (req, res) => {
    try {
        const allUsers = await Employee.find({}).select('name role attendance');
        const today = new Date().toISOString().slice(0, 10);

        const todaysStatus = allUsers.map(user => {
            const attendanceRecord = user.attendance.find(att => att.date === today);

            if (attendanceRecord) {
                let status = attendanceRecord.status;

                if (status === 'Present') {
                    status = (attendanceRecord.checkOut && attendanceRecord.checkOut !== '--') ? 'Present' : 'Punched In';
                }

                return {
                    employeeName: user.name,
                    role: user.role,
                    date: today,
                    checkIn: attendanceRecord.checkIn,
                    checkOut: attendanceRecord.checkOut,
                    status: status
                };
            } else {
                return {
                    employeeName: user.name,
                    role: user.role,
                    date: today,
                    checkIn: '--',
                    checkOut: '--',
                    status: 'Not Punched In'
                };
            }
        });

        res.json(todaysStatus);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching today\'s attendance status' });
    }
};

// Get personal salary history for the logged-in HR
exports.getHrSalaryHistory = async (req, res) => {
    try {
        const hr = await Employee.findById(req.params.id).select('salaryHistory');
        if (!hr) return res.status(404).json({ message: 'HR not found' });
        res.json(hr.salaryHistory);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching HR salary history' });
    }
};

// Manually Mark Attendance
exports.manualMarkAttendance = async (req, res) => {
    const { employeeId, date, status } = req.body;

    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found.' });
        }

        const attendanceRecord = employee.attendance.find(att => att.date === date);

        if (attendanceRecord) {
            // If record exists, update status and clear times
            attendanceRecord.status = status;
            attendanceRecord.checkIn = '--';
            attendanceRecord.checkOut = '--';
        } else {
            // If no record, create a new one
            employee.attendance.push({
                date,
                status,
                checkIn: '--',
                checkOut: '--'
            });
        }

        await employee.save();
        res.status(200).json(employee.attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error marking attendance' });
    }
};

// Get Attendance Sheet Data
exports.getAttendanceSheet = async (req, res) => {
    try {
        const employees = await Employee.find({}).select('name attendance');
        const dateSet = new Set();
        
        // First, collect all unique dates from all attendance records
        employees.forEach(emp => {
            emp.attendance.forEach(att => {
                dateSet.add(att.date);
            });
        });

        const allDates = Array.from(dateSet).sort((a, b) => new Date(b) - new Date(a));

        const attendanceSheet = employees.map(emp => {
            const attendanceByDate = emp.attendance.reduce((acc, att) => {
                acc[att.date] = att.status;
                return acc;
            }, {});

            return {
                employeeId: emp._id,
                employeeName: emp.name,
                attendance: attendanceByDate
            };
        });

        res.json({ dates: allDates, sheet: attendanceSheet });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance sheet data' });
    }
};