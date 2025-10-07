const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveRequestSchema = new Schema({
  type: String,
  startDate: String,
  endDate: String,
  status: { type: String, default: 'Pending' },
  reason: String,
  rejectionReason: String,
});

const notificationSchema = new Schema({
  message: String,
  date: String,
  status: { type: String, default: 'unread' },
  sentBy: { type: Schema.Types.ObjectId, ref: 'Employee' } 
});

const salarySchema = new Schema({
  month: String,
  amount: Number, // This will now store the Net Salary
  grossSalary: Number,
  deductions: Number,
  workedDays: Number,
  status: String,
  date: String,
  slipPath: { type: String }
});

const attendanceSchema = new Schema({
  date: String,
  checkIn: String,
  checkOut: String,
  status: String,
});

const employeeSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Employee', 'Admin', 'HR'], default: 'Employee' },
  baseSalary: { type: Number, default: 0 }, 
  attendance: [attendanceSchema],
  fileName: { type: String },
  filePath: { type: String }, 
  salaryHistory: [salarySchema],
  leaveRequests: [leaveRequestSchema],
  notifications: [notificationSchema],
  additionalDetails: { type: Schema.Types.ObjectId, ref: 'AdditionalDetails' } 
});

module.exports = mongoose.model('Employee', employeeSchema);