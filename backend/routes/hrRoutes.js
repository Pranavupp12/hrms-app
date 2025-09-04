// backend/routes/hrRoutes.js

const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');
const multer = require('multer');
const path = require('path');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
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

module.exports = router;