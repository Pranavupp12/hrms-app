const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// ✅ 1. Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// ✅ 2. Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hrms-documents',
    allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx'],
  },
});

const upload = multer({ storage: storage });

// Employee Management
router.get('/employees', adminController.getAllEmployees);
router.post('/employees',upload.single('file'), adminController.addEmployee);
router.put('/employees/:id', upload.single('file'), adminController.updateEmployee);
router.delete('/employees/:id', adminController.deleteEmployee);
router.put('/grant-reupload-access', adminController.grantReuploadAccess);

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
//router.post('/salary', adminController.punchSalary);
router.get('/:id/salaries', adminController.getAdminSalaryHistory); 
router.post('/generate-salary', adminController.generateSalarySlips);


// Attendance Routes 
router.get('/attendance/all', adminController.getAllAttendance);
router.get('/attendance/today', adminController.getTodaysAttendance);
router.get('/:id/attendance', adminController.getAdminAttendance);
router.post('/:id/punch-in', adminController.adminPunchIn);
router.post('/:id/punch-out', adminController.adminPunchOut);
router.put('/attendance/manual-mark', adminController.manualMarkAttendance);
router.get('/attendance-sheet', adminController.getAttendanceSheet);

module.exports = router;