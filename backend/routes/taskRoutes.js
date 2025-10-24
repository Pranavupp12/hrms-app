const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.get('/user/:id', taskController.getTasksForUser);
router.get('/admin-created/:id', taskController.getAdminCreatedTasks);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.put('/:id/status', taskController.updateTaskStatus);

module.exports = router;