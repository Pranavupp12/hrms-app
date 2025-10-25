// backend/controllers/hrController.js

const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const SentNotification = require('../models/SentNotification');
const bcrypt = require('bcryptjs');

// Fetch all employees
exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().select('-password').sort({ _id: -1 });
        res.json(employees);
    } catch (error) {
        console.error("Error in getAllEmployees (HR):", error);
        res.status(500).json({ message: 'Error fetching employees' });
    }
};

// Add a new employee
exports.addEmployee = async (req, res) => {
    const io = req.app.get('socketio');
    const { name, email, password, role, baseSalary } = req.body;
    try {

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newEmployeeData = {
            name,
            email,
            password:hashedPassword,
            role: role || 'Employee',
            baseSalary
        };

        // ✅ Add Cloudinary file data if a file was uploaded
        if (req.file) {
            newEmployeeData.filePath = req.file.path;           // The secure URL from Cloudinary
            newEmployeeData.fileName = req.file.originalname;  // The original file name
            newEmployeeData.filePublicId = req.file.filename;  // The Cloudinary public_id
        }

        const newEmployee = new Employee(newEmployeeData);
        await newEmployee.save();
        
        // ✅ Emit the event with the new employee data
        io.emit('employee_added', newEmployee);

        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).json({ message: 'Error adding employee' });
    }
};

// Get notifications for the logged-in HR
exports.getHrNotifications = async (req, res) => {
    try {
        const hr = await Employee.findById(req.params.id).populate('notifications.sentBy', 'name role').select('notifications');;
        if (!hr) return res.status(404).json({ message: 'HR not found' });
        // ✅ Sort notifications array in memory (newest first by _id)
        const sortedNotifications = hr.notifications.sort((a, b) => {
             const idA = a._id.toString();
             const idB = b._id.toString();
             if (idA > idB) return -1;
             if (idA < idB) return 1;
             return 0;
        });

        res.json(sortedNotifications);
    } catch (error) {
        console.error("Error in getHrNotifications:", error);
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
        const notifications = await SentNotification.find().populate('sentBy', 'name role').sort({ _id: -1 });
        res.json(notifications);
    } catch (error) {
        console.error("Error in getSentNotifications (HR):", error);
        res.status(500).json({ message: 'Error fetching sent notifications' });
    }
};

// Send a notification
exports.sendNotification = async (req, res) => {
    const io = req.app.get('socketio');

    const { recipient, message, senderId } = req.body; // Add senderId
    const newNotification = {
        message,
        date: new Date().toISOString().slice(0, 10),
        status: 'unread',
        sentBy: senderId 
    };

    try {
        // ✅ 1. Fetch the sender's details to populate the object
        const sender = await Employee.findById(senderId).select('name role');
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found.' });
        }

        // ✅ 2. Create a complete object specifically for the WebSocket event
        const notificationForSocket = {
            ...newNotification,
            _id: new mongoose.Types.ObjectId(), // Generate a temporary ID for the key
            sentBy: sender.toObject() // Attach the full sender object
        };

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

       // ✅ 3. Emit the NEW, populated object via WebSocket
        if (recipient === 'all') {
            io.emit('new_notification', notificationForSocket);
        } else if (Array.isArray(recipient)) {
            recipient.forEach(userId => {
                io.to(userId).emit('new_notification', notificationForSocket);
            });
        }

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
        // ✅ Sort by date descending
        allAttendance.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            // Optional secondary sort by name if dates are same
            if (a.employeeName < b.employeeName) return -1;
            if (a.employeeName > b.employeeName) return 1;
            return 0;
        });
        res.json(allAttendance);
    } catch (error) {
        console.error("Error in getAllAttendance (HR):", error);
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
};

// Get personal attendance for the logged-in HR
exports.getHrAttendance = async (req, res) => {
    try {
        const hr = await Employee.findById(req.params.id).select('attendance');
        if (!hr) return res.status(404).json({ message: 'HR not found' });
        // ✅ Sort attendance array in memory (newest date first)
        const sortedAttendance = hr.attendance.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            return 0;
        });

        res.json(sortedAttendance);
    } catch (error) {
        console.error("Error in getHrAttendance:", error);
        res.status(500).json({ message: 'Error fetching HR attendance' });
    }
};

// Punch In for HR
exports.hrPunchIn = async (req, res) => {
    const io = req.app.get('socketio');
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
            checkIn: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' , hour12: false }),
            checkOut: '',
            status: 'Present'
        };

        hr.attendance.push(newAttendance);
        await hr.save();

        // ✅ THE FIX: Use the 'hr' variable instead of 'admin'
        const updatedRecord = {
            employeeName: hr.name,
            role: hr.role,
            date: today,
            checkIn: newAttendance.checkIn,
            checkOut: '--',
            status: 'Punched In'
        };
        io.emit('attendance_updated', updatedRecord);

        res.status(200).json({ success: true, message: "Punch-in successful." });

    } catch (error) {
        console.error("HR Punch-in error:", error);
        res.status(500).json({ message: 'Error punching in' });
    }
};

// Punch Out for HR
exports.hrPunchOut = async (req, res) => {
    const io = req.app.get('socketio'); // ✅ 1. Get the io instance
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

        attendanceRecord.checkOut = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' , hour12: false });
        await hr.save();

        // ✅ 2. Define and emit the updated record
        const updatedRecord = {
            employeeName: hr.name,
            role: hr.role,
            date: today,
            checkIn: attendanceRecord.checkIn,
            checkOut: attendanceRecord.checkOut,
            status: 'Present'
        };
        io.emit('attendance_updated', updatedRecord);
        
        // ✅ 3. Send the success response
        res.status(200).json({ success: true, message: "Punch-out successful." });

    } catch (error) {
        console.error("HR Punch-out error:", error);
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
        // ✅ Sort salary history in memory (newest date first, then _id)
        const sortedHistory = hr.salaryHistory.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            const idA = a._id.toString();
            const idB = b._id.toString();
            if (idA > idB) return -1;
            if (idA < idB) return 1;
            return 0;
        });

        res.json(sortedHistory);
    } catch (error) {
        console.error("Error in getHrSalaryHistory:", error);
        res.status(500).json({ message: 'Error fetching HR salary history' });
    }
};

// Manually Mark Attendance
exports.manualMarkAttendance = async (req, res) => {

    const io = req.app.get('socketio');

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

        // ✅ 2. Create the payload for the WebSocket event
        const updatedRecord = {
            employeeName: employee.name,
            role: employee.role,
            date: date,
            checkIn: '--',
            checkOut: '--',
            status: status
        };

        // ✅ 3. Emit the event to all connected clients
        io.emit('attendance_updated', updatedRecord);

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

// ✅ NEW: Fetch all leave requests (Identical to Admin's)
exports.getAllLeaveRequests = async (req, res) => {
    try {
        const employees = await Employee.find();
        // Flatten the leave requests and add employee name and the specific leave ID
        const leaveRequests = employees.flatMap(emp =>
            emp.leaveRequests.map(lr => ({
                ...lr.toObject(),
                employeeName: emp.name,
                id: lr._id // Use 'id' for consistency with frontend expectations
            }))
        );
        // ✅ Sort the flattened list by the leave request's _id (descending)
        leaveRequests.sort((a, b) => {
            const idA = a._id.toString();
            const idB = b._id.toString();
            if (idA > idB) return -1; // Newer ID comes first
            if (idA < idB) return 1;
            return 0;
        });

        res.json(leaveRequests);
    } catch (error) {
        console.error("Error in getAllLeaveRequests (HR):", error);
        res.status(500).json({ message: 'Error fetching leave requests' });
    }
};

// ✅ NEW: Approve a leave request (Identical to Admin's logic)
exports.approveLeaveRequest = async (req, res) => {
    const io = req.app.get('socketio');
    try {
        // Find the employee whose leave request matches the ID
        const employee = await Employee.findOne({ 'leaveRequests._id': req.params.leaveId });
        if (!employee) {
            return res.status(404).json({ message: 'Leave request not found.' });
        }
        
        // Get the specific subdocument
        const leaveRequest = employee.leaveRequests.id(req.params.leaveId);
        if (!leaveRequest) {
             return res.status(404).json({ message: 'Leave request subdocument not found.' });
        }

        leaveRequest.status = 'Approved';
        await employee.save();

        // Emit update ONLY to the employee who applied
        io.to(employee._id.toString()).emit('leave_status_updated', leaveRequest);

        res.json(leaveRequest); // Send back the updated leave request
    } catch (error) {
        console.error("Error approving leave:", error);
        res.status(500).json({ message: 'Error approving leave request' });
    }
};

// ✅ NEW: Reject a leave request (Identical to Admin's logic)
exports.rejectLeaveRequest = async (req, res) => {
    const io = req.app.get('socketio');
    const { rejectionReason } = req.body; // Get reason from request body
    try {
        const employee = await Employee.findOne({ 'leaveRequests._id': req.params.leaveId });
        if (!employee) {
            return res.status(404).json({ message: 'Leave request not found.' });
        }
        
        const leaveRequest = employee.leaveRequests.id(req.params.leaveId);
         if (!leaveRequest) {
             return res.status(404).json({ message: 'Leave request subdocument not found.' });
        }

        leaveRequest.status = 'Rejected';
        leaveRequest.rejectionReason = rejectionReason; // Save the reason
        await employee.save();

        // Emit update ONLY to the employee who applied
        io.to(employee._id.toString()).emit('leave_status_updated', leaveRequest);

        res.json(leaveRequest);
    } catch (error) {
        console.error("Error rejecting leave:", error);
        res.status(500).json({ message: 'Error rejecting leave request' });
    }
};