const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.get('/:id/attendance', employeeController.getAttendance);
router.get('/:id/salaries', employeeController.getSalaryHistory);
router.get('/:id/leaves', employeeController.getLeaveRequests);
router.post('/:id/leaves', employeeController.applyForLeave);
router.get('/:id/notifications', employeeController.getNotifications);
router.put('/:id/notifications/:notificationId', employeeController.markNotificationAsRead);

module.exports = router;