const mongoose = require('mongoose');
const { Schema } = mongoose;

const sentNotificationSchema = new Schema({
  date: { type: String, required: true },
  message: { type: String, required: true },
  recipient: { type: String, required: true }, // "All Employees" or an employee's name
});

module.exports = mongoose.model('SentNotification', sentNotificationSchema);