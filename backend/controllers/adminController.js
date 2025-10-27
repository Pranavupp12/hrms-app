const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const SentNotification = require("../models/SentNotification");
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;
const cloudinary = require("cloudinary").v2;
const AdditionalDetails = require("../models/AdditionalDetails");
const bcrypt = require("bcryptjs");

// Fetch all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .select("-password")
      .populate("additionalDetails")
      .sort({ _id: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: "Error fetching employees" });
  }
};

// Add a new employee
exports.addEmployee = async (req, res) => {
  const io = req.app.get("socketio");
  const { name, email, password, role, baseSalary } = req.body;
  try {
    const salt = await bcrypt.genSalt(10); // Generate a salt
    const hashedPassword = await bcrypt.hash(password, salt); // Create the hash

    const newEmployeeData = {
      name,
      email,
      password: hashedPassword,
      role: role || "Employee",
      baseSalary,
    };

    // ✅ Add Cloudinary file data if a file was uploaded
    if (req.file) {
      newEmployeeData.filePath = req.file.path; // The secure URL from Cloudinary
      newEmployeeData.fileName = req.file.originalname; // The original file name
      newEmployeeData.filePublicId = req.file.filename; // The Cloudinary public_id
    }

    const newEmployee = new Employee(newEmployeeData);
    await newEmployee.save();

    io.emit("employee_added", newEmployee);

    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(500).json({ message: "Error adding employee" });
  }
};

// Update an employee
exports.updateEmployee = async (req, res) => {
  const io = req.app.get("socketio");
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

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    // ✅ Emit the event with the updated employee data
    io.emit("employee_updated", updatedEmployee);

    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ message: "Error updating employee" });
  }
};

// Delete an employee
exports.deleteEmployee = async (req, res) => {
  const io = req.app.get("socketio"); // ✅ 1. Get the io instance
  try {
    const { id } = req.params; // Get the ID before deleting

    const employeeToDelete = await Employee.findById(id);
    if (!employeeToDelete) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await employeeToDelete.deleteOne(); // Use deleteOne() on the document

    // ✅ 2. Emit the event with the ID of the deleted employee
    io.emit("employee_deleted", { id });

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Error deleting employee" });
  }
};

// Fetch all leave requests
exports.getAllLeaveRequests = async (req, res) => {
  try {
    const employees = await Employee.find();
    const leaveRequests = employees.flatMap((emp) =>
      emp.leaveRequests.map((lr) => ({
        ...lr.toObject(),
        employeeName: emp.name,
        id: lr._id,
      }))
    );
    // Sort the flattened list by leave request ID (most recent first)
    // Sort the flattened list by the leave request's _id (descending)
    leaveRequests.sort((a, b) => {
      // Mongoose ObjectIds can be compared directly, but converting to string is safer
      const idA = a._id.toString();
      const idB = b._id.toString();
      if (idA > idB) return -1; // Newer ID comes first
      if (idA < idB) return 1;
      return 0;
    });
    res.json(leaveRequests);
  } catch (error) {
    console.error("Error in getAllLeaveRequests:", error);
    res.status(500).json({ message: "Error fetching leave requests" });
  }
};

// Approve a leave request
exports.approveLeaveRequest = async (req, res) => {
  const io = req.app.get("socketio");
  try {
    const employee = await Employee.findOne({
      "leaveRequests._id": req.params.leaveId,
    });
    if (!employee)
      return res.status(404).json({ message: "Leave request not found." });
    const leaveRequest = employee.leaveRequests.id(req.params.leaveId);
    leaveRequest.status = "Approved";
    await employee.save();

    // ✅ Emit the event directly to the employee's private room
    io.to(employee._id.toString()).emit("leave_status_updated", leaveRequest);

    res.json(leaveRequest);
  } catch (error) {
    res.status(500).json({ message: "Error approving leave request" });
  }
};

// Reject a leave request
exports.rejectLeaveRequest = async (req, res) => {
  const io = req.app.get("socketio");

  const { rejectionReason } = req.body;
  try {
    const employee = await Employee.findOne({
      "leaveRequests._id": req.params.leaveId,
    });
    if (!employee)
      return res.status(404).json({ message: "Leave request not found." });
    const leaveRequest = employee.leaveRequests.id(req.params.leaveId);
    leaveRequest.status = "Rejected";
    leaveRequest.rejectionReason = rejectionReason;
    await employee.save();

    // ✅ Emit the event directly to the employee's private room
    io.to(employee._id.toString()).emit("leave_status_updated", leaveRequest);

    res.json(leaveRequest);
  } catch (error) {
    res.status(500).json({ message: "Error rejecting leave request" });
  }
};

// Get notifications for the logged-in admin
exports.getAdminNotifications = async (req, res) => {
  try {
    const admin = await Employee.findById(req.params.id)
      .populate("notifications.sentBy", "name role")
      .select("notifications");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    // Sort notifications array in memory (newest first)
    const sortedNotifications = admin.notifications.sort((a, b) => {
      if (a._id > b._id) return -1;
      if (a._id < b._id) return 1;
      return 0;
    }); // ✅ Sort subdocuments

    res.json(sortedNotifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin notifications" });
  }
};

// Mark a notification as read for the logged-in admin
exports.markNotificationAsRead = async (req, res) => {
  try {
    const admin = await Employee.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const notification = admin.notifications.id(req.params.notificationId);
    if (notification) {
      notification.status = "read";
      await admin.save();
      res.json(notification);
    } else {
      res.status(404).json({ message: "Notification not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating notification" });
  }
};

// Fetch sent notifications history
exports.getSentNotifications = async (req, res) => {
  try {
    const notifications = await SentNotification.find()
      .populate("sentBy", "name role")
      .sort({ _id: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sent notifications" });
  }
};

// Send a notification
exports.sendNotification = async (req, res) => {
  const io = req.app.get("socketio");

  const { recipient, message, senderId } = req.body; // Add senderId
  const newNotification = {
    message,
    date: new Date().toISOString().slice(0, 10),
    status: "unread",
    sentBy: senderId, // Associate the notification with the sender
  };

  try {
    const sender = await Employee.findById(senderId).select("name role");
    if (!sender) {
      return res.status(404).json({ message: "Sender not found." });
    }

    // ✅ 2. Create a complete object specifically for the WebSocket event
    const notificationForSocket = {
      ...newNotification,
      _id: new mongoose.Types.ObjectId(), // Generate a temporary ID for the key
      sentBy: sender.toObject(), // Attach the full sender object
    };

    let recipientNames = [];

    if (recipient === "all") {
      await Employee.updateMany(
        {},
        { $push: { notifications: newNotification } }
      );
      recipientNames.push("All Employees");
    } else if (Array.isArray(recipient) && recipient.length > 0) {
      const areIdsValid = recipient.every((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );
      if (!areIdsValid) {
        return res
          .status(400)
          .json({ message: "Invalid recipient ID provided." });
      }

      const employees = await Employee.find({ _id: { $in: recipient } }).select(
        "name"
      );
      if (employees.length !== recipient.length) {
        return res
          .status(404)
          .json({ message: "One or more recipient employees not found." });
      }

      await Employee.updateMany(
        { _id: { $in: recipient } },
        { $push: { notifications: newNotification } }
      );
      recipientNames = employees.map((emp) => emp.name);
    } else {
      return res.status(400).json({ message: "A recipient is required." });
    }

    const sentNotification = new SentNotification({
      date: newNotification.date,
      message,
      recipient: recipientNames.join(", "),
      sentBy: senderId, // Save the sender's ID
    });

    await sentNotification.save();

    // ✅ 3. Emit the NEW, populated object via WebSocket
    if (recipient === "all") {
      io.emit("new_notification", notificationForSocket);
    } else if (Array.isArray(recipient)) {
      console.log("Attempting to send notification to rooms:", recipient);
      recipient.forEach((userId) => {
        io.to(userId).emit("new_notification", notificationForSocket);
      });
    }

    res.status(201).json(sentNotification);
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ message: "Error sending notification" });
  }
};

// Fetch salary history for all employees
exports.getSalaryHistory = async (req, res) => {
  try {
    const employees = await Employee.find().select("name salaryHistory");
    const salaryHistory = employees.flatMap((emp) =>
      emp.salaryHistory.map((sh) => ({
        ...sh.toObject(),
        employeeName: emp.name,
        id: sh._id,
      }))
    );
    // Sort combined history (e.g., by date or _id descending)
    // Sort combined history: newest date first, then newest _id if dates are the same
    salaryHistory.sort((a, b) => {
      // Compare dates first (descending)
      const dateA = new Date(a.date); // Convert string date to Date object
      const dateB = new Date(b.date);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;

      // If dates are the same, compare by _id (descending)
      const idA = a._id.toString();
      const idB = b._id.toString();
      if (idA > idB) return -1;
      if (idA < idB) return 1;

      return 0;
    });
    res.json(salaryHistory);
  } catch (error) {
    console.error("Error in getSalaryHistory:", error); // Add specific logging
    res.status(500).json({ message: "Error fetching salary history" });
  }
};

// Get all attendance records for ALL users (Employees and Admins)
exports.getAllAttendance = async (req, res) => {
  try {
    const users = await Employee.find({}).select("name attendance role");
    const allAttendance = users.flatMap((user) =>
      user.attendance.map((att) => ({
        employeeName: user.name,
        role: user.role,
        ...att.toObject(),
      }))
    );
    // Sort by date descending
    allAttendance = allAttendance.sort((a, b) => {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      // Optionally add secondary sort if needed (e.g., by name)
      if (a.employeeName < b.employeeName) return -1;
      if (a.employeeName > b.employeeName) return 1;
      return 0;
    }); // ✅ Sort combined records by date
    res.json(allAttendance);
  } catch (error) {
    res.status(500).json({ message: "Error fetching attendance records" });
  }
};

// Get personal attendance for the logged-in admin
exports.getAdminAttendance = async (req, res) => {
  try {
    const admin = await Employee.findById(req.params.id).select("attendance");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const sortedAttendance = admin.attendance.sort((a, b) => {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
    }); // ✅ Sort subdocuments by date
    res.json(sortedAttendance);
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin attendance" });
  }
};

// Punch In for Admin
exports.adminPunchIn = async (req, res) => {
  const io = req.app.get("socketio");
  try {
    const hourString = new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
    });

    const currentHour = parseInt(hourString, 10);

    // Check if current time is outside the 9 AM to 11 AM window
    if (currentHour < 9 || currentHour >= 11) {
      return res
        .status(400)
        .json({ message: "Punch-in is only allowed between 9 AM and 11 AM." });
    }

    const admin = await Employee.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const today = new Date().toISOString().slice(0, 10);
    const alreadyPunchedIn = admin.attendance.some((att) => att.date === today);

    if (alreadyPunchedIn) {
      return res.status(400).json({ message: "Already punched in for today" });
    }

    const newAttendance = {
      date: today,
      checkIn: new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
      }),
      checkOut: "",
      status: "Present",
    };

    admin.attendance.push(newAttendance);
    await admin.save();

    // ✅ Emit an attendance update event
    const updatedRecord = {
      employeeName: admin.name,
      role: admin.role,
      date: today,
      checkIn: newAttendance.checkIn,
      checkOut: "--",
      status: "Punched In",
    };
    io.emit("attendance_updated", updatedRecord);

    res.status(201).json({ success: true, message: "Punch-in successful." });
  } catch (error) {
    res.status(500).json({ message: "Error punching in" });
  }
};

// Punch Out for Admin
// backend/controllers/adminController.js
exports.adminPunchOut = async (req, res) => {
  const io = req.app.get("socketio");
  try {
    const admin = await Employee.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const today = new Date().toISOString().slice(0, 10);

    const attendanceRecord = admin.attendance.find(
      (att) =>
        att.date === today &&
        att.checkIn &&
        att.checkIn !== "--" &&
        (!att.checkOut || att.checkOut === "--" || att.checkOut === "")
    );

    if (!attendanceRecord) {
      return res
        .status(400)
        .json({ message: "Cannot punch out without punching in first" });
    }

    attendanceRecord.checkOut = new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
    await admin.save();

    // ✅ 2. Define and emit the updated record
    const updatedRecord = {
      employeeName: admin.name,
      role: admin.role,
      date: today,
      checkIn: attendanceRecord.checkIn,
      checkOut: attendanceRecord.checkOut,
      status: "Present",
    };
    io.emit("attendance_updated", updatedRecord);

    res.status(201).json({ success: true, message: "Punch-in successful." });
  } catch (error) {
    res.status(500).json({ message: "Error punching out" });
  }
};

// Get a complete attendance status for all users for today
exports.getTodaysAttendance = async (req, res) => {
  try {
    const allUsers = await Employee.find({}).select("name role attendance");
    const today = new Date().toISOString().slice(0, 10);

    const todaysStatus = allUsers.map((user) => {
      const attendanceRecord = user.attendance.find(
        (att) => att.date === today
      );

      if (attendanceRecord) {
        let status = attendanceRecord.status;

        // Only recalculate the status if it's the default "Present"
        // This preserves manual statuses like "Sick Leave", "Absent", etc.
        if (status === "Present") {
          status =
            attendanceRecord.checkOut && attendanceRecord.checkOut !== "--"
              ? "Present"
              : "Punched In";
        }

        return {
          employeeName: user.name,
          role: user.role,
          date: today,
          checkIn: attendanceRecord.checkIn,
          checkOut: attendanceRecord.checkOut,
          status: status,
        };
      } else {
        return {
          employeeName: user.name,
          role: user.role,
          date: today,
          checkIn: "--",
          checkOut: "--",
          status: "Not Punched In",
        };
      }
    });

    res.json(todaysStatus);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching today's attendance status" });
  }
};

// Get personal salary history for the logged-in Admin
exports.getAdminSalaryHistory = async (req, res) => {
  try {
    const admin = await Employee.findById(req.params.id).select(
      "salaryHistory"
    );
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin.salaryHistory);
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin salary history" });
  }
};

// Manually Mark Attendance
exports.manualMarkAttendance = async (req, res) => {
  const io = req.app.get("socketio");

  const { employeeId, date, status } = req.body;

  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const attendanceRecord = employee.attendance.find(
      (att) => att.date === date
    );

    if (attendanceRecord) {
      // If record exists, update status and clear times
      attendanceRecord.status = status;
      attendanceRecord.checkIn = "--";
      attendanceRecord.checkOut = "--";
    } else {
      // If no record, create a new one
      employee.attendance.push({
        date,
        status,
        checkIn: "--",
        checkOut: "--",
      });
    }

    await employee.save();

    // ✅ 2. Create the payload for the WebSocket event
    const updatedRecord = {
      employeeName: employee.name,
      role: employee.role,
      date: date,
      checkIn: "--",
      checkOut: "--",
      status: status,
    };

    // ✅ 3. Emit the event to all connected clients
    io.emit("attendance_updated", updatedRecord);

    res.status(200).json(employee.attendance);
  } catch (error) {
    res.status(500).json({ message: "Error marking attendance" });
  }
};

// Get Attendance Sheet Data
exports.getAttendanceSheet = async (req, res) => {
  try {
    const employees = await Employee.find({}).select("name attendance");
    const dateSet = new Set();

    // First, collect all unique dates from all attendance records
    employees.forEach((emp) => {
      emp.attendance.forEach((att) => {
        dateSet.add(att.date);
      });
    });

    const allDates = Array.from(dateSet).sort(
      (a, b) => new Date(b) - new Date(a)
    );

    const attendanceSheet = employees.map((emp) => {
      const attendanceByDate = emp.attendance.reduce((acc, att) => {
        acc[att.date] = att.status;
        return acc;
      }, {});

      return {
        employeeId: emp._id,
        employeeName: emp.name,
        attendance: attendanceByDate,
      };
    });

    res.json({ dates: allDates, sheet: attendanceSheet });
  } catch (error) {
    res.status(500).json({ message: "Error fetching attendance sheet data" });
  }
};

// Generate Salary Slips for selected employees for a specific month
exports.generateSalarySlips = async (req, res) => {
  const io = req.app.get("socketio");
  const { employeeIds, month } = req.body;
  try {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Please select at least one employee." });
    }

    const employees = await Employee.find({
      _id: { $in: employeeIds },
    }).populate("attendance");
    const [monthName, year] = month.split(" ");
    const monthIndex = new Date(Date.parse(monthName + " 1, 2012")).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // **Declare processingPromises before the loop**
    const processingPromises = [];

    for (const employee of employees) {
      if (!employee.baseSalary || employee.baseSalary <= 0) {
        console.warn(
          `Skipping ${employee.name} due to missing or invalid salary.`
        );
        continue;
      }

      const perDaySalary = employee.baseSalary / daysInMonth;
      let payableDays = 0;
      let unpaidLeaveDays = 0;

      employee.attendance.forEach((att) => {
        const attYear = new Date(att.date).getFullYear();
        const attMonth = new Date(att.date).getMonth();

        if (attYear === parseInt(year) && attMonth === monthIndex) {
          if (att.status === "Present" || att.status === "Paid Leave") {
            payableDays += 1;
          } else if (att.status === "Half Day") {
            payableDays += 0.5;
          } else if (att.status === "Short Leave") {
            payableDays += 0.75;
          } else if (att.status === "Absent" || att.status === "Sick Leave") {
            unpaidLeaveDays += 1;
          }
        }
      });

      const grossEarnings = perDaySalary * payableDays;
      const leaveDeductions = perDaySalary * unpaidLeaveDays;
      const netSalary = grossEarnings;

      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text("Dash Media Solution", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Salary slip for the month of ${month}`, 105, 30, {
        align: "center",
      });

      autoTable(doc, {
        startY: 40,
        head: [["Employee Information", "Details"]],
        body: [
          ["Employee ID", employee._id.toString()],
          ["Employee Name", employee.name],
          ["Payable Days", payableDays.toString()],
          ["Unpaid Leave Days", unpaidLeaveDays.toString()],
        ],
        theme: "striped",
        headStyles: { fillColor: [240, 240, 240], textColor: 20 },
      });

      const earningsTableY = doc.lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: earningsTableY,
        head: [["Earnings", "Amount"]],
        body: [["Gross Earnings", grossEarnings.toFixed(2)]],
        theme: "grid",
        tableWidth: 85,
        columnStyles: { 1: { halign: "right" } },
      });

      const earningsFinalY = doc.lastAutoTable.finalY;

      autoTable(doc, {
        startY: earningsTableY,
        head: [["Deductions", "Amount"]],
        body: [["Leave Deductions", leaveDeductions.toFixed(2)]],
        theme: "grid",
        tableWidth: 85,
        margin: { left: 110 },
        columnStyles: { 1: { halign: "right" } },
      });

      const deductionsFinalY = doc.lastAutoTable.finalY;
      const finalY = Math.max(earningsFinalY, deductionsFinalY);

      autoTable(doc, {
        startY: finalY + 5,
        body: [
          ["Gross Salary for Month", employee.baseSalary.toFixed(2)],
          ["Total Deductions", leaveDeductions.toFixed(2)],
          ["Net Salary", netSalary.toFixed(2)],
        ],
        theme: "grid",
        styles: { fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" } },
      });

      // ✅ 2. Get PDF output as a Buffer
      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

      // ✅ 3. Create a promise to upload the buffer and update the DB
      const processSlipPromise = new Promise((resolve, reject) => {
        const uploadOptions = {
          // Create options object explicitly
          folder: "salary-slips",
          public_id: `slip_${employee._id}_${month.replace(/\s+/g, "_")}`,
          resource_type: "raw",
          format: "pdf",
          access_mode: "public",
        };

        // ✅ ADD THIS CONSOLE LOG
        console.log(
          `Uploading slip for ${employee.name} with options:`,
          uploadOptions
        );

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          async (error, result) => {
            // Make this callback async
            if (error) {
              console.error(
                `Cloudinary upload error for ${employee.name}:`,
                error
              );
              return reject(
                new Error(`Failed to upload slip for ${employee.name}`)
              );
            }
            if (!result) {
              return reject(
                new Error(`Cloudinary result empty for ${employee.name}`)
              );
            }

            // Prepare salary record with Cloudinary URL
            const salaryRecord = {
              amount: netSalary,
              grossSalary: grossEarnings,
              deductions: leaveDeductions,
              workedDays: payableDays,
              month,
              status: "Paid", // Or 'Paid'
              date: new Date().toISOString().slice(0, 10),
              slipPath: result.secure_url, // ✅ Store Cloudinary URL
              slipPublicId: result.public_id, // ✅ Optional: Store public_id
            };

            try {
              // Save the record to the employee's document
              const updatedEmployee = await Employee.findByIdAndUpdate(
                employee._id,
                { $push: { salaryHistory: salaryRecord } },
                { new: true } // Return the updated document
              );

              if (updatedEmployee) {
                // Get the newly added record
                const newRecord =
                  updatedEmployee.salaryHistory[
                    updatedEmployee.salaryHistory.length - 1
                  ];
                // Emit socket event
                io.to(employee._id.toString()).emit(
                  "new_salary_record",
                  newRecord
                );
                console.log(
                  `Slip processed and DB updated for ${employee.name}`
                );
                resolve({ success: true, employeeName: employee.name }); // Resolve the promise
              } else {
                reject(
                  new Error(
                    `Failed to find employee ${employee.name} after update.`
                  )
                );
              }
            } catch (dbError) {
              console.error(
                `Database update error for ${employee.name}:`,
                dbError
              );
              // Optional: Try to delete the uploaded Cloudinary file if DB fails
              cloudinary.uploader.destroy(result.public_id, {
                resource_type: "raw",
              });
              reject(
                new Error(`Failed to save salary record for ${employee.name}`)
              );
            }
          }
        );
        // Pipe the buffer into the upload stream
        uploadStream.end(pdfBuffer);
      });

      processingPromises.push(processSlipPromise);
    } // End of employee loop

    // ✅ 4. Wait for all uploads and DB updates to complete
    const results = await Promise.allSettled(processingPromises);

    const successfulCount = results.filter(
      (r) => r.status === "fulfilled"
    ).length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    let message = `Successfully processed slips for ${successfulCount} employees.`;
    if (failedCount > 0) {
      message += ` Failed to process slips for ${failedCount} employees. Check server logs for details.`;
      // Consider returning a 207 Multi-Status if some failed
      return res.status(failedCount > 0 ? 207 : 200).json({ message });
    }

    res.status(200).json({ message }); // Use 200 OK as slips are generated and stored
  } catch (error) {
    console.error("Error in generateSalarySlips function:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error generating salary slips";
    res.status(500).json({ message: errorMessage });
  }
};

// New function to grant re-upload access
exports.grantReuploadAccess = async (req, res) => {
  const { employeeId, field } = req.body;
  const io = req.app.get("socketio");
  try {
    const details = await AdditionalDetails.findOne({ employee: employeeId });
    if (!details) {
      return res
        .status(404)
        .json({ message: "Additional details not found for this employee." });
    }

    if (!details.reuploadAccess.includes(field)) {
      details.reuploadAccess.push(field);
      await details.save();
    }
    // ✅ 2. Emit an event ONLY to this employee's room
    io.to(employeeId).emit("reupload_access_granted", {
      field: field,
      message: `Re-upload access has been granted for your ${field}.`,
    });

    res.status(200).json({ message: `Re-upload access granted for ${field}.` });
  } catch (error) {
    res.status(500).json({ message: "Error granting re-upload access." });
  }
};
