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
            fileName: req.file ? req.file.originalname : null // Save original filename
        };
        const newEmployee = new Employee(newEmployeeData);
        await newEmployee.save();
        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).json({ message: 'Error adding employee' });
    }
};

// Update an employee
exports.updateEmployee = async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const updateData = { name, email, role };

        if (password) {
            updateData.password = password;
        }

        if (req.file) {
            updateData.filePath = req.file.path;
            updateData.fileName = req.file.originalname; // Save original filename on update
        }
        
        const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(updatedEmployee);
    } catch (error) {
        res.status(500).json({ message: 'Error updating employee' });
    }
};

// Delete an employee
exports.deleteEmployee = async (req, res) => {
    try {
        await Employee.findByIdAndDelete(req.params.id);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting employee' });
    }
};

// Fetch all leave requests
exports.getAllLeaveRequests = async (req, res) => {
    try {
        const employees = await Employee.find();
        const leaveRequests = employees.flatMap(emp => emp.leaveRequests.map(lr => ({ ...lr.toObject(), employeeName: emp.name, id: lr._id })));
        res.json(leaveRequests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave requests' });
    }
};

// Approve a leave request
exports.approveLeaveRequest = async (req, res) => {
    try {
        const employee = await Employee.findOne({ 'leaveRequests._id': req.params.leaveId });
        if (!employee) return res.status(404).json({ message: 'Leave request not found.' });
        const leaveRequest = employee.leaveRequests.id(req.params.leaveId);
        leaveRequest.status = 'Approved';
        await employee.save();
        res.json(leaveRequest);
    } catch (error) {
        res.status(500).json({ message: 'Error approving leave request' });
    }
};

// Reject a leave request
exports.rejectLeaveRequest = async (req, res) => {
    const { rejectionReason } = req.body;
    try {
        const employee = await Employee.findOne({ 'leaveRequests._id': req.params.leaveId });
        if (!employee) return res.status(404).json({ message: 'Leave request not found.' });
        const leaveRequest = employee.leaveRequests.id(req.params.leaveId);
        leaveRequest.status = 'Rejected';
        leaveRequest.rejectionReason = rejectionReason;
        await employee.save();
        res.json(leaveRequest);
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting leave request' });
    }
};



// Get notifications for the logged-in admin
exports.getAdminNotifications = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json(admin.notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin notifications' });
    }
};

// Mark a notification as read for the logged-in admin
exports.markNotificationAsRead = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const notification = admin.notifications.id(req.params.notificationId);
        if (notification) {
            notification.status = 'read';
            await admin.save();
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

// Send a notification - CORRECTED LOGIC
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
            // Validate if the recipient is a valid ObjectId before querying
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


// Fetch salary history for all employees
exports.getSalaryHistory = async (req, res) => {
    try {
        const employees = await Employee.find().select('name salaryHistory');
        const salaryHistory = employees.flatMap(emp => emp.salaryHistory.map(sh => ({ ...sh.toObject(), employeeName: emp.name, id: sh._id })));
        res.json(salaryHistory);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching salary history' });
    }
};

// Punch in salary for an employee
exports.punchSalary = async (req, res) => {
    const { employeeId, amount, month } = req.body;
    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: 'Employee not found.' });
        employee.salaryHistory.push({ amount, month, status: 'Paid', date: new Date().toISOString().slice(0, 10) });
        await employee.save();
        res.status(201).json(employee.salaryHistory);
    } catch (error) {
        res.status(500).json({ message: 'Error punching salary' });
    }
};


// Get all attendance records for ALL users (Employees and Admins)
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

// Get personal attendance for the logged-in admin
exports.getAdminAttendance = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id).select('attendance');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json(admin.attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin attendance' });
    }
};

// Punch In for Admin
exports.adminPunchIn = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const today = new Date().toISOString().slice(0, 10);
        const alreadyPunchedIn = admin.attendance.some(att => att.date === today);

        if (alreadyPunchedIn) {
            return res.status(400).json({ message: 'Already punched in for today' });
        }

        const newAttendance = {
            date: today,
            checkIn: new Date().toLocaleTimeString('en-IN', { hour12: false }),
            checkOut: '',
            status: 'Present'
        };

        admin.attendance.push(newAttendance);
        await admin.save();
        res.status(201).json(admin.attendance);

    } catch (error) {
        res.status(500).json({ message: 'Error punching in' });
    }
};

// Punch Out for Admin
exports.adminPunchOut = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const today = new Date().toISOString().slice(0, 10);
        const attendanceRecord = admin.attendance.find(att => att.date === today);

        if (!attendanceRecord) {
            return res.status(400).json({ message: 'Cannot punch out without punching in first' });
        }

        if (attendanceRecord.checkOut) {
            return res.status(400).json({ message: 'Already punched out for today' });
        }

        attendanceRecord.checkOut = new Date().toLocaleTimeString('en-IN', { hour12: false });
        await admin.save();
        res.status(200).json(admin.attendance);

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
                // User has an attendance record for today
                return {
                    employeeName: user.name,
                    role: user.role,
                    date: today,
                    checkIn: attendanceRecord.checkIn,
                    checkOut: attendanceRecord.checkOut,
                    status: attendanceRecord.checkOut ? 'Present' : 'Punched In'
                };
            } else {
                // User has NOT punched in yet today
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