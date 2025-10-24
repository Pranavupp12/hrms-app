const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { 
        type: String, 
        default: 'Pending', 
        enum: ['Pending', 'Completed'] 
    },
    createdBy: { // The Admin who created the task
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    assignedTo: { // The Employee who must complete the task
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);