// src/types/index.ts
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type PunchStatus = 'punched-out' | 'punched-in' | 'completed' |  'absent';

export type AttendanceStatus = "Present" | "Absent" | "Punched In" | "Not Punched In" | "Sick Leave" | "Paid Leave" | "Short Leave" | "Half Day"; 

export interface LeaveRequest {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
  rejectionReason?: string;
}

export interface AppNotification {
  _id: string;
  message: string;
  date: string;
  status: "read" | "unread";
  sentBy?: { 
    name: string;
    role: string;
  };
}

export interface Salary {
  _id: string;
  id: string;
  month: string;
  amount: number; // Net Salary
  grossSalary?: number;
  deductions?: number;
  workedDays?: number;
  status: string;
  date?: string;
  employeeName?: string;
  slipPath?: string;
}


export interface Attendance {
  _id:string
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
}

export interface AllUserAttendance extends Attendance {
  employeeId: string;
  employeeName: string;
  role: string;
}

export interface Employee {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: "Employee" | "Admin" | "HR";
  filePath?: string; 
  fileName?: string; 
  attendance: Attendance[];
  salaryHistory: Salary[];
  leaveRequests: LeaveRequest[];
  notifications: AppNotification[]; 
  additionalDetails?: AdditionalDetails;
  baseSalary?: number;
}

export interface SentNotification {
  _id: string;
  date: string;
  message: string;
  recipient: 'All Employees' | string; // Can be 'All Employees' or a specific employee's name
  sentBy: {
    name: string;
    role: string;
  };
  sentAt: string;
}

export const manualAttendanceStatuses: AttendanceStatus[] = [
  "Absent", 
  "Sick Leave", 
  "Paid Leave", 
  "Short Leave", 
  "Half Day"
];

export type AttendanceSheetData = {
    employeeId: string;
    employeeName: string;
    attendance: {
        [date: string]: AttendanceStatus;
    };
};

export interface FileData {
  path: string;
  originalName: string;
}

export interface AdditionalDetails {
  personalEmail?: string;
  reuploadAccess?: string[];
  tenthMarksheet?: FileData;
  twelfthMarksheet?: FileData;
  resume?: FileData;
  panCardFront?: FileData;
  aadharCardFront?: FileData;
  aadharCardBack?: FileData;
  cancelledCheque?: FileData;
}

export interface Event {
    _id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    employee: string;
    status?: 'pending' | 'completed'; 
    assignedTo: string
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  status: 'Pending' | 'Completed';
  createdBy: {
    _id: string;
    name: string;
  };
  assignedTo: {
    _id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}


