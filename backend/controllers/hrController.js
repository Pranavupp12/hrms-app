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
    const { name, email, password, role } = req.body;
    try {
        const newEmployeeData = {
            name,
            email,
            password,
            role: role || 'Employee',
            filePath: req.file ? req.file.path : null,
            fileName: req.file ? req.file.originalname : null
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
        const hr = await Employee.findById(req.params.id);
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
        const notifications = await SentNotification.find();
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sent notifications' });
    }
};

// Send a notification
exports.sendNotification = async (req, res) => {
    const { recipient, message } = req.body;
    const newNotification = {
        message,
        date: new Date().toISOString().slice(0, 10),
        status: 'unread'
    };

    try {
        let recipientName = 'All Employees';

        if (recipient === 'all') {
            await Employee.updateMany({}, { $push: { notifications: newNotification } });
        } else {
            if (!mongoose.Types.ObjectId.isValid(recipient)) {
                return res.status(400).json({ message: 'Invalid recipient ID.' });
            }
            const employee = await Employee.findByIdAndUpdate(recipient, { $push: { notifications: newNotification } });
            if (employee) {
                recipientName = employee.name;
            } else {
                return res.status(404).json({ message: 'Recipient employee not found.' });
            }
        }

        const sentNotification = new SentNotification({
            date: newNotification.date,
            message,
            recipient: recipientName,
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
exports.hrPunchOut = async (req, res) => {
    try {
        const hr = await Employee.findById(req.params.id);
        if (!hr) return res.status(404).json({ message: 'HR not found' });

        const today = new Date().toISOString().slice(0, 10);
        const attendanceRecord = hr.attendance.find(att => att.date === today);

        if (!attendanceRecord) {
            return res.status(400).json({ message: 'Cannot punch out without punching in first' });
        }

        if (attendanceRecord.checkOut) {
            return res.status(400).json({ message: 'Already punched out for today' });
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
                return {
                    employeeName: user.name,
                    role: user.role,
                    date: today,
                    checkIn: attendanceRecord.checkIn,
                    checkOut: attendanceRecord.checkOut,
                    status: attendanceRecord.checkOut ? 'Present' : 'Punched In'
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