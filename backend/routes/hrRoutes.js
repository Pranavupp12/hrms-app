// backend/routes/hrRoutes.js

const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');
const multer = require('multer');
const path = require('path');
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
router.get('/employees', hrController.getAllEmployees);
router.post('/employees',upload.single('file'), hrController.addEmployee);

// Notifications
router.get('/notifications', hrController.getSentNotifications);
router.post('/notifications', hrController.sendNotification);
router.get('/:id/notifications', hrController.getHrNotifications);
router.put('/:id/notifications/:notificationId', hrController.markNotificationAsRead);

// Attendance
router.get('/attendance/all', hrController.getAllAttendance);
router.get('/attendance/today', hrController.getTodaysAttendance);
router.get('/:id/attendance', hrController.getHrAttendance);
router.post('/:id/punch-in', hrController.hrPunchIn);
router.post('/:id/punch-out', hrController.hrPunchOut);
router.put('/attendance/manual-mark', hrController.manualMarkAttendance);
router.get('/attendance-sheet', hrController.getAttendanceSheet);


// Salary History
router.get('/:id/salaries', hrController.getHrSalaryHistory);


module.exports = router;