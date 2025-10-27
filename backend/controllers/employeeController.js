const Employee = require("../models/Employee");

// Fetch attendance history for an employee
exports.getAttendance = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select(
      "attendance"
    );
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });
    // ✅ Sort attendance array in memory (newest date first)
    const sortedAttendance = employee.attendance.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      return 0;
    });

    res.json(sortedAttendance);
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    res.status(500).json({ message: "Error fetching attendance data" });
  }
};

// Fetch salary history for an employee
exports.getSalaryHistory = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select(
      "salaryHistory"
    );
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });
    // ✅ Sort salary history in memory (newest date first, then _id)
    const sortedHistory = employee.salaryHistory.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      // Fallback sort by _id if dates are the same
      const idA = a._id.toString();
      const idB = b._id.toString();
      if (idA > idB) return -1;
      if (idA < idB) return 1;
      return 0;
    });

    res.json(sortedHistory);
  } catch (error) {
    console.error("Error fetching employee salary history:", error);
    res.status(500).json({ message: "Error fetching salary history" });
  }
};

// Fetch leave requests for an employee
exports.getLeaveRequests = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select(
      "leaveRequests"
    );
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });
    // ✅ Sort leave requests array in memory (newest first by _id)
    const sortedRequests = employee.leaveRequests.sort((a, b) => {
      const idA = a._id.toString();
      const idB = b._id.toString();
      if (idA > idB) return -1;
      if (idA < idB) return 1;
      return 0;
    });

    res.json(sortedRequests);
  } catch (error) {
    console.error("Error fetching employee leave requests:", error);
    res.status(500).json({ message: "Error fetching leave requests" });
  }
};

// Apply for leave
exports.applyForLeave = async (req, res) => {
  const io = req.app.get("socketio");
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });
    employee.leaveRequests.push(req.body);
    await employee.save();

    // ✅ Emit event to all connected clients
    const lastLeave = employee.leaveRequests[employee.leaveRequests.length - 1];
    io.emit("new_leave_request", {
      ...lastLeave.toObject(),
      employeeName: employee.name,
      id: lastLeave._id,
    });

    // ✅ Sort before sending back the full list in the response
    const sortedRequests = employee.leaveRequests.sort((a, b) => {
      const idA = a._id.toString();
      const idB = b._id.toString();
      if (idA > idB) return -1;
      if (idA < idB) return 1;
      return 0;
    });

    res.status(201).json(sortedRequests);
  } catch (error) {
    console.error("Error applying for leave:", error);
    res.status(500).json({ message: "Error applying for leave" });
  }
};

// Get notifications for an employee
exports.getNotifications = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate("notifications.sentBy", "name role")
      .select("notifications");
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });
    // ✅ Sort notifications array in memory (newest first by _id)
    const sortedNotifications = employee.notifications.sort((a, b) => {
      const idA = a._id.toString();
      const idB = b._id.toString();
      if (idA > idB) return -1;
      if (idA < idB) return 1;
      return 0;
    });

    res.json(sortedNotifications);
  } catch (error) {
    console.error("Error fetching employee notifications:", error);
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

// Mark a notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const notification = employee.notifications.id(req.params.notificationId);
    if (notification) {
      notification.status = "read";
      await employee.save();
      res.json(notification);
    } else {
      res.status(404).json({ message: "Notification not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating notification" });
  }
};

exports.punchIn = async (req, res) => {
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

    const employee = await Employee.findById(req.params.id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const today = new Date().toISOString().slice(0, 10);
    const alreadyPunchedIn = employee.attendance.some(
      (att) => att.date === today
    );

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

    employee.attendance.push(newAttendance);
    await employee.save();

    const updatedRecord = {
      employeeName: employee.name,
      role: employee.role,
      date: today,
      checkIn: newAttendance.checkIn,
      checkOut: "--",
      status: "Punched In",
    };

    io.emit("attendance_updated", updatedRecord);

    res.status(200).json({ success: true, message: "Punch-in successful." });
  } catch (error) {
    res.status(500).json({ message: "Error punching in" });
  }
};

// backend/controllers/employeeController.js
exports.punchOut = async (req, res) => {
  const io = req.app.get("socketio");
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const today = new Date().toISOString().slice(0, 10);

    const attendanceRecord = employee.attendance.find(
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
    await employee.save();

    // ✅ DEFINE THE UPDATED RECORD OBJECT
    const updatedRecord = {
      employeeName: employee.name,
      role: employee.role,
      date: today,
      checkIn: attendanceRecord.checkIn,
      checkOut: attendanceRecord.checkOut,
      status: "Present",
    };
    io.emit("attendance_updated", updatedRecord);

    res.status(200).json({ success: true, message: "Punch-out successful." });
  } catch (error) {
    res.status(500).json({ message: "Error punching out" });
  }
};
