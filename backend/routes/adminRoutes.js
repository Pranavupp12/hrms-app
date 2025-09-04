const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const multer = require('multer');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Employee Management
router.get('/employees', adminController.getAllEmployees);
router.post('/employees',upload.single('file'), adminController.addEmployee);
router.put('/employees/:id', upload.single('file'), adminController.updateEmployee);
router.delete('/employees/:id', adminController.deleteEmployee);

// Leave Management
router.get('/leave-requests', adminController.getAllLeaveRequests);
router.put('/leave-requests/:leaveId/approve', adminController.approveLeaveRequest);
router.put('/leave-requests/:leaveId/reject', adminController.rejectLeaveRequest);

// Notification Management
router.get('/notifications', adminController.getSentNotifications);
router.post('/notifications', adminController.sendNotification);

// Admin's own notifications
router.get('/:id/notifications', adminController.getAdminNotifications);
router.put('/:id/notifications/:notificationId', adminController.markNotificationAsRead);

// Salary Management
router.get('/salaries', adminController.getSalaryHistory);
router.post('/salary', adminController.punchSalary);
router.get('/:id/salaries', adminController.getAdminSalaryHistory); 

// Attendance Routes 
router.get('/attendance/all', adminController.getAllAttendance);
router.get('/attendance/today', adminController.getTodaysAttendance);
router.get('/:id/attendance', adminController.getAdminAttendance);
router.post('/:id/punch-in', adminController.adminPunchIn);
router.post('/:id/punch-out', adminController.adminPunchOut);

module.exports = router;