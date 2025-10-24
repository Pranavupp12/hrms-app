const Task = require('../models/Task');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');

// GET /api/tasks/user/:id (Get all tasks ASSIGNED TO a user for their Home tab)
exports.getTasksForUser = async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.id })
            .populate('createdBy', 'name')
            .populate('assignedTo', 'name');
        res.json(tasks || []);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user tasks' });
    }
};

// GET /api/tasks/admin-created/:id (Get all tasks CREATED BY an admin for their Mgmt tab)
exports.getAdminCreatedTasks = async (req, res) => {
    try {
        const adminId = req.params.id;
        const tasks = await Task.find({ createdBy: adminId, })
            .populate('createdBy', 'name')
            .populate('assignedTo', 'name');
        res.json(tasks || []);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin-created tasks' });
    }
};

// POST /api/tasks (Admin creates a new task)
exports.createTask = async (req, res) => {
    const io = req.app.get('socketio');
    const { title, description, date, time, createdBy, assignedTo } = req.body;
    try {
        const newTask = new Task({ title, description, date, time, createdBy, assignedTo });
        await newTask.save();

        const populatedTask = await Task.findById(newTask._id)
            .populate('createdBy', 'name')
            .populate('assignedTo', 'name');

        // Notify the Admin's management table if it's an assigned task
        if (createdBy.toString() !== assignedTo.toString()) {
            io.emit('admin_task_created', populatedTask);
        }
        // Notify the assigned employee's personal dashboard
        io.to(assignedTo.toString()).emit('personal_task_update');

        res.status(201).json(populatedTask);
    } catch (error) {
        res.status(500).json({ message: 'Error creating task' });
    }
};

// PUT /api/tasks/:id (Admin updates a task)
exports.updateTask = async (req, res) => {
    const io = req.app.get('socketio');
    try {
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('createdBy', 'name')
            .populate('assignedTo', 'name');
        if (!updatedTask) return res.status(404).json({ message: 'Task not found' });

        io.emit('admin_task_updated', updatedTask);
        io.to(updatedTask.assignedTo._id.toString()).emit('personal_task_update');

        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task' });
    }
};

// DELETE /api/tasks/:id (Admin deletes a task)
exports.deleteTask = async (req, res) => {
    const io = req.app.get('socketio');
    try {
        const deletedTask = await Task.findByIdAndDelete(req.params.id);
        if (!deletedTask) return res.status(404).json({ message: 'Task not found' });

        io.emit('admin_task_deleted', { id: req.params.id });
        io.to(deletedTask.assignedTo.toString()).emit('personal_task_update');

        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task' });
    }
};

// PUT /api/tasks/:id/status (Employee marks a task as completed)
exports.updateTaskStatus = async (req, res) => {
    const io = req.app.get('socketio');
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { status: 'Completed' },
            { new: true }
        ).populate('createdBy', 'name').populate('assignedTo', 'name');
        
        if (!task) return res.status(404).json({ message: 'Task not found.' });

        // ✅ THE FIX: Emit both events
        // 1. Notify the Admin's management table that the status changed
        io.emit('admin_task_status_updated', task);
        // 2. Notify the user to update their personal task list
        io.to(task.assignedTo._id.toString()).emit('personal_task_update');
        
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task status.' });
    }
};