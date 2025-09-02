// src/types/index.ts
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveRequest {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
  rejectionReason?: string;
}

export interface Notification {
  _id: string;
  message: string;
  date: string;
  status: "read" | "unread";
}

export interface Salary {
  month: string;
  amount: number;
  status: "Paid" | "Pending";
  date?: string;
}

export interface Attendance {
  date: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Absent" | "On Leave";
}

export interface Employee {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: "Employee" | "Admin";
  attendance: Attendance[];
  salaryHistory: Salary[];
  leaveRequests: LeaveRequest[];
  notifications: Notification[]; 
}

export interface SentNotification {
  _id: string;
  date: string;
  message: string;
  recipient: 'All Employees' | string; // Can be 'All Employees' or a specific employee's name
}
