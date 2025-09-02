const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Employee Management
router.get('/employees', adminController.getAllEmployees);
router.post('/employees', adminController.addEmployee);
router.delete('/employees/:id', adminController.deleteEmployee);

// Leave Management
router.get('/leave-requests', adminController.getAllLeaveRequests);
router.put('/leave-requests/:leaveId/approve', adminController.approveLeaveRequest);
router.put('/leave-requests/:leaveId/reject', adminController.rejectLeaveRequest);

// Notification Management
router.get('/notifications', adminController.getSentNotifications);
router.post('/notifications', adminController.sendNotification);

// Salary Management
router.get('/salaries', adminController.getSalaryHistory);
router.post('/salary', adminController.punchSalary);

module.exports = router;