import type { Employee,SentNotification } from "@/types";

export const mockEmployee: Employee = {
  id: "emp-001",
  name: "John Doe",
  email: "john.doe@company.com",
  role: "Employee",
  attendance: [
    { date: "2025-08-28", checkIn: "09:01 AM", checkOut: "06:05 PM", status: "Present" },
    { date: "2025-08-27", checkIn: "09:05 AM", checkOut: "05:55 PM", status: "Present" },
  ],
  salaryHistory: [
    { month: "August 2025", amount: 50000, status: "Paid", date: "2025-09-01" },
    { month: "July 2025", amount: 49500, status: "Paid", date: "2025-08-01" },
  ],
  leaveRequests: [
    { 
      id: "leave-1", 
      type: "Sick Leave", 
      startDate: "2025-09-02", 
      endDate: "2025-09-02", 
      status: "Pending",
      reason: "Feeling unwell."
    },
    {
      id: "leave-3",
      type: "Casual Leave",
      startDate: "2025-09-05",
      endDate: "2025-09-05",
      status: "Rejected",
      reason: "Attending a family event.",
      rejectionReason: "We have a critical client meeting on this day that requires your presence. Please consider rescheduling."
    }
  ],
  notifications: [
    {
      id: "notif-1",
      message: "Welcome to the team! We're excited to have you on board.",
      date: "2025-08-25",
      status: "unread",
    },
    {
      id: "notif-2",
      message: "Please complete your onboarding documents by the end of the week.",
      date: "2025-08-26",
      status: "read",
    },
  ],
};

export const mockAllEmployees: Employee[] = [
    mockEmployee,
    {
        id: "emp-002",
        name: "Jane Smith",
        email: "jane.smith@company.com",
        role: "Employee",
        attendance: [],
        salaryHistory: [
            { month: "August 2025", amount: 55000, status: "Paid", date: "2025-09-01" },
            { month: "July 2025", amount: 55000, status: "Paid", date: "2025-08-01" },
        ],
        leaveRequests: [
            { 
              id: "leave-2", 
              type: "Vacation", 
              startDate: "2025-09-10", 
              endDate: "2025-09-15", 
              status: "Rejected", // <-- UPDATED
              reason: "Trip to the mountains.",
              rejectionReason: "This request conflicts with a critical project deadline. Please consider rescheduling for after the 20th." // <-- ADDED
            },
        ],
        notifications: [
           {
              id: "notif-3",
              message: "Reminder: The quarterly all-hands meeting is this Friday.",
              date: "2025-08-27",
              status: "unread",
           }
        ]
    },
];


export const mockSentNotifications: SentNotification[] = [
  {
    id: 'sent-1',
    date: '2025-08-30',
    message: 'The office will be closed on Monday for a public holiday.',
    recipient: 'All Employees',
  },
  {
    id: 'sent-2',
    date: '2025-08-29',
    message: 'Welcome to the team! We are excited to have you.',
    recipient: 'Jane Smith',
  },
  {
    id: 'sent-3',
    date: '2025-08-28',
    message: 'Please remember to submit your quarterly performance reviews by Friday.',
    recipient: 'All Employees',
  },
];