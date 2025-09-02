const Employee = require('../models/Employee');

// Fetch attendance history for an employee
exports.getAttendance = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee.attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance data' });
    }
};

// Fetch salary history for an employee
exports.getSalaryHistory = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee.salaryHistory);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching salary history' });
    }
};

// Fetch leave requests for an employee
exports.getLeaveRequests = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee.leaveRequests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave requests' });
    }
};

// Apply for leave
exports.applyForLeave = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        employee.leaveRequests.push(req.body);
        await employee.save();
        res.status(201).json(employee.leaveRequests);
    } catch (error) {
        res.status(500).json({ message: 'Error applying for leave' });
    }
};

// Get notifications for an employee
exports.getNotifications = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee.notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mark a notification as read
exports.markNotificationAsRead = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const notification = employee.notifications.id(req.params.notificationId);
        if (notification) {
            notification.status = 'read';
            await employee.save();
            res.json(notification);
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
};