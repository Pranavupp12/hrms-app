const mongoose = require('mongoose');
const Employee = require('./models/Employee');
require('dotenv').config();

const seedData = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123', // Use a secure password in a real application
    role: 'Admin',
  },
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'Employee',
    attendance: [
      { date: "2025-09-01", checkIn: "09:01 AM", checkOut: "06:05 PM", status: "Present" },
      { date: "2025-08-29", checkIn: "09:05 AM", checkOut: "05:55 PM", status: "Present" },
    ],
    salaryHistory: [
      { month: "August 2025", amount: 50000, status: "Paid", date: "2025-09-01" },
    ],
     leaveRequests: [
    { 
      type: "Sick Leave", 
      startDate: "2025-09-02", 
      endDate: "2025-09-02", 
      status: "Pending",
      reason: "Feeling unwell."
    }]
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding.');

    await Employee.deleteMany({});
    console.log('Existing employees cleared.');

    await Employee.insertMany(seedData);
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

seedDB();

// Function to seed the database with initial data
// Usage: node backend/seed.js