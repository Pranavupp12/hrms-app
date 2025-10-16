const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const SentNotification = require('../models/SentNotification');
const { jsPDF } = require("jspdf");
const autoTable = require('jspdf-autotable').default;
const fs = require('fs');
const path = require('path');
const AdditionalDetails = require('../models/AdditionalDetails');
const bcrypt = require('bcryptjs');

// Fetch all employees
exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().select('-password').populate('additionalDetails');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employees' });
    }
};


// Add a new employee
exports.addEmployee = async (req, res) => {
    const { name, email, password, role, baseSalary } = req.body;
    try {

        const salt = await bcrypt.genSalt(10); // Generate a salt
        const hashedPassword = await bcrypt.hash(password, salt); // Create the hash

        const newEmployeeData = {
            name,
            email,
            password:hashedPassword,
            role: role || 'Employee',
            filePath: req.file ? req.file.path : null,
            fileName: req.file ? req.file.originalname : null,
            baseSalary,
        };
        const newEmployee = new Employee(newEmployeeData);
        await newEmployee.save();
        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).json({ message: 'Error adding employee' });
    }
};

// Update an employee
exports.updateEmployee = async (req, res) => {
    try {
        const { name, email, role, password, baseSalary } = req.body;
        const updateData = { name, email, role, baseSalary };

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        if (req.file) {
            updateData.filePath = req.file.path;
            updateData.fileName = req.file.originalname; // Save original filename on update
        }
        
        const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(updatedEmployee);
    } catch (error) {
        res.status(500).json({ message: 'Error updating employee' });
    }
};

// Delete an employee
exports.deleteEmployee = async (req, res) => {
    try {
        await Employee.findByIdAndDelete(req.params.id);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting employee' });
    }
};

// Fetch all leave requests
exports.getAllLeaveRequests = async (req, res) => {
    try {
        const employees = await Employee.find();
        const leaveRequests = employees.flatMap(emp => emp.leaveRequests.map(lr => ({ ...lr.toObject(), employeeName: emp.name, id: lr._id })));
        res.json(leaveRequests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave requests' });
    }
};

// Approve a leave request
exports.approveLeaveRequest = async (req, res) => {
    try {
        const employee = await Employee.findOne({ 'leaveRequests._id': req.params.leaveId });
        if (!employee) return res.status(404).json({ message: 'Leave request not found.' });
        const leaveRequest = employee.leaveRequests.id(req.params.leaveId);
        leaveRequest.status = 'Approved';
        await employee.save();
        res.json(leaveRequest);
    } catch (error) {
        res.status(500).json({ message: 'Error approving leave request' });
    }
};

// Reject a leave request
exports.rejectLeaveRequest = async (req, res) => {
    const { rejectionReason } = req.body;
    try {
        const employee = await Employee.findOne({ 'leaveRequests._id': req.params.leaveId });
        if (!employee) return res.status(404).json({ message: 'Leave request not found.' });
        const leaveRequest = employee.leaveRequests.id(req.params.leaveId);
        leaveRequest.status = 'Rejected';
        leaveRequest.rejectionReason = rejectionReason;
        await employee.save();
        res.json(leaveRequest);
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting leave request' });
    }
};



// Get notifications for the logged-in admin
exports.getAdminNotifications = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id).populate('notifications.sentBy', 'name role');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json(admin.notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin notifications' });
    }
};

// Mark a notification as read for the logged-in admin
exports.markNotificationAsRead = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const notification = admin.notifications.id(req.params.notificationId);
        if (notification) {
            notification.status = 'read';
            await admin.save();
            res.json(notification);
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
};

// Fetch sent notifications history
exports.getSentNotifications = async (req, res) => {
    try {
        const notifications = await SentNotification.find().populate('sentBy', 'name role');
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sent notifications' });
    }
};

// Send a notification 
exports.sendNotification = async (req, res) => {
    const { recipient, message, senderId } = req.body; // Add senderId
    const newNotification = {
        message,
        date: new Date().toISOString().slice(0, 10),
        status: 'unread',
        sentBy: senderId // Associate the notification with the sender
    };

    try {
        let recipientNames = [];

        if (recipient === 'all') {
            await Employee.updateMany({}, { $push: { notifications: newNotification } });
            recipientNames.push('All Employees');
        } else if (Array.isArray(recipient) && recipient.length > 0) {
            const areIdsValid = recipient.every(id => mongoose.Types.ObjectId.isValid(id));
            if (!areIdsValid) {
                return res.status(400).json({ message: 'Invalid recipient ID provided.' });
            }

            const employees = await Employee.find({ '_id': { $in: recipient } }).select('name');
            if (employees.length !== recipient.length) {
                return res.status(404).json({ message: 'One or more recipient employees not found.' });
            }

            await Employee.updateMany(
                { '_id': { $in: recipient } },
                { $push: { notifications: newNotification } }
            );
            recipientNames = employees.map(emp => emp.name);

        } else {
            return res.status(400).json({ message: 'A recipient is required.' });
        }

        const sentNotification = new SentNotification({
            date: newNotification.date,
            message,
            recipient: recipientNames.join(', '),
            sentBy: senderId // Save the sender's ID
        });

        await sentNotification.save();
        res.status(201).json(sentNotification);
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ message: 'Error sending notification' });
    }
};


// Fetch salary history for all employees
exports.getSalaryHistory = async (req, res) => {
    try {
        const employees = await Employee.find().select('name salaryHistory');
        const salaryHistory = employees.flatMap(emp => emp.salaryHistory.map(sh => ({ ...sh.toObject(), employeeName: emp.name, id: sh._id })));
        res.json(salaryHistory);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching salary history' });
    }
};

{/*// Punch in salary for an employee
exports.punchSalary = async (req, res) => {
    const { employeeIds, grossSalary, deductions, month, workedDays } = req.body;
    try {
        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ message: 'Please select at least one employee.' });
        }

        const employees = await Employee.find({ _id: { $in: employeeIds } });

        for (const employee of employees) {
            const gross = parseFloat(grossSalary);
            const totalDeductions = parseFloat(deductions);
            const netSalary = gross - totalDeductions;

            const slipDir = path.join(__dirname, '..', 'slips');
            if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true });
            const slipPath = `slips/slip_${employee._id}_${month.replace(/\s/g, '_')}.pdf`;

            const doc = new jsPDF();
            
            doc.setFontSize(20);
            doc.text("Your Company Name", 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Payslip for the month of ${month}`, 105, 30, { align: 'center' });

            autoTable(doc, {
                startY: 40,
                head: [['Employee Information', 'Details']],
                body: [
                    ['Employee ID', employee._id.toString()],
                    ['Employee Name', employee.name],
                    ['Worked Days', workedDays.toString()],
                ],
                theme: 'striped',
                headStyles: { fillColor: [240, 240, 240], textColor: 20 },
            });
            
            const earningsTableY = doc.lastAutoTable.finalY + 10;

            autoTable(doc, {
                startY: earningsTableY,
                head: [['Earnings', 'Amount']],
                body: [['Basic Salary', `${gross.toFixed(2)}`]],
                theme: 'grid',
                tableWidth: 85,
                columnStyles: { 1: { halign: 'right' } }
            });
            
            const earningsFinalY = doc.lastAutoTable.finalY;

            autoTable(doc, {
                startY: earningsTableY,
                head: [['Deductions', 'Amount']],
                body: [['Professional Tax', `${totalDeductions.toFixed(2)}`]],
                theme: 'grid',
                tableWidth: 85,
                margin: { left: 110 },
                columnStyles: { 1: { halign: 'right' } }
            });

            const deductionsFinalY = doc.lastAutoTable.finalY;
            const finalY = Math.max(earningsFinalY, deductionsFinalY);

            autoTable(doc, {
                startY: finalY + 10,
                body: [
                    ['Gross Salary', `${gross.toFixed(2)}`],
                    ['Total Deductions', `${totalDeductions.toFixed(2)}`],
                    ['Net Salary', `${netSalary.toFixed(2)}`],
                ],
                theme: 'grid',
                styles: { fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' } }, // Add this for alignment
            });
            
            const pdfOutput = doc.output();
            fs.writeFileSync(path.join(__dirname, '..', slipPath), pdfOutput);

            const salaryRecord = {
                amount: netSalary,
                grossSalary: gross,
                deductions: totalDeductions,
                workedDays,
                month,
                status: 'Paid',
                date: new Date().toISOString().slice(0, 10),
                slipPath,
            };

            employee.salaryHistory.push(salaryRecord);
            await employee.save();
        }

        res.status(201).json({ message: `Successfully created salary slips for ${employees.length} employees.` });
    } catch (error) {
        console.error('Error punching salary:', error);
        res.status(500).json({ message: 'Error creating salary slips' });
    }
};*/}


// Get all attendance records for ALL users (Employees and Admins)
exports.getAllAttendance = async (req, res) => {
    try {
        const users = await Employee.find({}).select('name attendance role');
        const allAttendance = users.flatMap(user => 
            user.attendance.map(att => ({
                employeeName: user.name,
                role: user.role,
                ...att.toObject()
            }))
        );
        res.json(allAttendance.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
};

// Get personal attendance for the logged-in admin
exports.getAdminAttendance = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id).select('attendance');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json(admin.attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin attendance' });
    }
};

// Punch In for Admin
exports.adminPunchIn = async (req, res) => {
    try {

        const now = new Date();
        const currentHour = now.getHours();

        // Check if current time is outside the 9 AM to 11 AM window
        if (currentHour < 9 || currentHour >= 11) {
            return res.status(400).json({ message: 'Punch-in is only allowed between 9 AM and 11 AM.' });
        }

        const admin = await Employee.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const today = new Date().toISOString().slice(0, 10);
        const alreadyPunchedIn = admin.attendance.some(att => att.date === today);

        if (alreadyPunchedIn) {
            return res.status(400).json({ message: 'Already punched in for today' });
        }

        const newAttendance = {
            date: today,
            checkIn: new Date().toLocaleTimeString('en-IN', { hour12: false }),
            checkOut: '',
            status: 'Present'
        };

        admin.attendance.push(newAttendance);
        await admin.save();
        res.status(201).json(admin.attendance);

    } catch (error) {
        res.status(500).json({ message: 'Error punching in' });
    }
};

// Punch Out for Admin
// backend/controllers/adminController.js
exports.adminPunchOut = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const today = new Date().toISOString().slice(0, 10);
        
        const attendanceRecord = admin.attendance.find(att => 
            att.date === today && 
            att.checkIn && att.checkIn !== '--' && 
            (!att.checkOut || att.checkOut === '--' || att.checkOut === '')
        );

        if (!attendanceRecord) {
            return res.status(400).json({ message: 'Cannot punch out without punching in first' });
        }

        attendanceRecord.checkOut = new Date().toLocaleTimeString('en-IN', { hour12: false });
        await admin.save();
        res.status(200).json(admin.attendance);

    } catch (error) {
        res.status(500).json({ message: 'Error punching out' });
    }
};

// Get a complete attendance status for all users for today
exports.getTodaysAttendance = async (req, res) => {
    try {
        const allUsers = await Employee.find({}).select('name role attendance');
        const today = new Date().toISOString().slice(0, 10);

        const todaysStatus = allUsers.map(user => {
            const attendanceRecord = user.attendance.find(att => att.date === today);

            if (attendanceRecord) {
                let status = attendanceRecord.status;

                // Only recalculate the status if it's the default "Present"
                // This preserves manual statuses like "Sick Leave", "Absent", etc.
                if (status === 'Present') {
                    status = (attendanceRecord.checkOut && attendanceRecord.checkOut !== '--') ? 'Present' : 'Punched In';
                }

                return {
                    employeeName: user.name,
                    role: user.role,
                    date: today,
                    checkIn: attendanceRecord.checkIn,
                    checkOut: attendanceRecord.checkOut,
                    status: status
                };
            } else {
                return {
                    employeeName: user.name,
                    role: user.role,
                    date: today,
                    checkIn: '--',
                    checkOut: '--',
                    status: 'Not Punched In'
                };
            }
        });

        res.json(todaysStatus);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching today\'s attendance status' });
    }
};

// Get personal salary history for the logged-in Admin
exports.getAdminSalaryHistory = async (req, res) => {
    try {
        const admin = await Employee.findById(req.params.id).select('salaryHistory');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json(admin.salaryHistory);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin salary history' });
    }
};

// Manually Mark Attendance
exports.manualMarkAttendance = async (req, res) => {
    const { employeeId, date, status } = req.body;

    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found.' });
        }

        const attendanceRecord = employee.attendance.find(att => att.date === date);

        if (attendanceRecord) {
            // If record exists, update status and clear times
            attendanceRecord.status = status;
            attendanceRecord.checkIn = '--';
            attendanceRecord.checkOut = '--';
        } else {
            // If no record, create a new one
            employee.attendance.push({
                date,
                status,
                checkIn: '--',
                checkOut: '--'
            });
        }

        await employee.save();
        res.status(200).json(employee.attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error marking attendance' });
    }
};

// Get Attendance Sheet Data
exports.getAttendanceSheet = async (req, res) => {
    try {
        const employees = await Employee.find({}).select('name attendance');
        const dateSet = new Set();
        
        // First, collect all unique dates from all attendance records
        employees.forEach(emp => {
            emp.attendance.forEach(att => {
                dateSet.add(att.date);
            });
        });

        const allDates = Array.from(dateSet).sort((a, b) => new Date(b) - new Date(a));

        const attendanceSheet = employees.map(emp => {
            const attendanceByDate = emp.attendance.reduce((acc, att) => {
                acc[att.date] = att.status;
                return acc;
            }, {});

            return {
                employeeId: emp._id,
                employeeName: emp.name,
                attendance: attendanceByDate
            };
        });

        res.json({ dates: allDates, sheet: attendanceSheet });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance sheet data' });
    }
};

// Generate Salary Slips for selected employees for a specific month
    exports.generateSalarySlips = async (req, res) => {
    const { employeeIds, month } = req.body;
    try {
        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ message: 'Please select at least one employee.' });
        }

        const employees = await Employee.find({ _id: { $in: employeeIds } }).populate('attendance');
        const [monthName, year] = month.split(' ');
        const monthIndex = new Date(Date.parse(monthName + " 1, 2012")).getMonth();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        for (const employee of employees) {
            if (!employee.baseSalary || employee.baseSalary <= 0) {
                console.warn(`Skipping ${employee.name} due to missing or invalid salary.`);
                continue;
            }

            const perDaySalary = employee.baseSalary / daysInMonth;
            let payableDays = 0;
            let unpaidLeaveDays = 0;

            employee.attendance.forEach(att => {
                const attYear = new Date(att.date).getFullYear();
                const attMonth = new Date(att.date).getMonth();

                if (attYear === parseInt(year) && attMonth === monthIndex) {
                    if (att.status === 'Present' || att.status === 'Paid Leave') {
                        payableDays += 1;
                    } else if (att.status === 'Half Day') {
                        payableDays += 0.5;
                    } else if (att.status === 'Short Leave') {
                        payableDays += 0.75;
                    } else if (att.status === 'Absent' || att.status === 'Sick Leave') {
                        unpaidLeaveDays += 1;
                    }
                }
            });

            const grossEarnings = perDaySalary * payableDays;
            const leaveDeductions = perDaySalary * unpaidLeaveDays;
            const netSalary = grossEarnings;

            const slipDir = path.join(__dirname, '..', 'slips');
            if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true });
            const slipPath = `slips/slip_${employee._id}_${month.replace(/\s/g, '_')}.pdf`;
            const doc = new jsPDF();

            doc.setFontSize(20);
            doc.text("Dash Media Solution", 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Salary slip for the month of ${month}`, 105, 30, { align: 'center' });

            autoTable(doc, {
                startY: 40,
                head: [['Employee Information', 'Details']],
                body: [
                    ['Employee ID', employee._id.toString()],
                    ['Employee Name', employee.name],
                    ['Payable Days', payableDays.toString()],
                    ['Unpaid Leave Days', unpaidLeaveDays.toString()],
                ],
                theme: 'striped',
                headStyles: { fillColor: [240, 240, 240], textColor: 20 },
            });

            const earningsTableY = doc.lastAutoTable.finalY + 10;

            autoTable(doc, {
                startY: earningsTableY,
                head: [['Earnings', 'Amount']],
                body: [['Gross Earnings', grossEarnings.toFixed(2)]],
                theme: 'grid',
                tableWidth: 85,
                columnStyles: { 1: { halign: 'right' } }
            });
            
            const earningsFinalY = doc.lastAutoTable.finalY;

            autoTable(doc, {
                startY: earningsTableY,
                head: [['Deductions', 'Amount']],
                body: [['Leave Deductions', leaveDeductions.toFixed(2)]],
                theme: 'grid',
                tableWidth: 85,
                margin: { left: 110 },
                columnStyles: { 1: { halign: 'right' } }
            });

            const deductionsFinalY = doc.lastAutoTable.finalY;
            const finalY = Math.max(earningsFinalY, deductionsFinalY);

            autoTable(doc, {
                startY: finalY + 5,
                body: [
                    ['Gross Salary for Month', employee.baseSalary.toFixed(2)],
                    ['Total Deductions', leaveDeductions.toFixed(2)],
                    ['Net Salary', netSalary.toFixed(2)],
                ],
                theme: 'grid',
                styles: { fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' } },
            });
            
            const pdfOutput = doc.output();
            fs.writeFileSync(path.join(__dirname, '..', slipPath), pdfOutput);
            
            const salaryRecord = {
                amount: netSalary,
                grossSalary: grossEarnings,
                deductions: leaveDeductions,
                workedDays: payableDays,
                month,
                status: 'Paid',
                date: new Date().toISOString().slice(0, 10),
                slipPath,
            };

                await Employee.findByIdAndUpdate(employee._id, {
                $push: { salaryHistory: salaryRecord }
            });
        }

        res.status(201).json({ message: `Successfully generated salary slips.` });
    } catch (error) {
        console.error('Error generating salary slips:', error);
        res.status(500).json({ message: 'Error creating salary slips' });
    }
};

// New function to grant re-upload access
exports.grantReuploadAccess = async (req, res) => {
    const { employeeId, field } = req.body;
    try {
        const details = await AdditionalDetails.findOne({ employee: employeeId });
        if (!details) {
            return res.status(404).json({ message: 'Additional details not found for this employee.' });
        }

        if (!details.reuploadAccess.includes(field)) {
            details.reuploadAccess.push(field);
            await details.save();
        }

        res.status(200).json({ message: `Re-upload access granted for ${field}.` });
    } catch (error) {
        res.status(500).json({ message: 'Error granting re-upload access.' });
    }
};