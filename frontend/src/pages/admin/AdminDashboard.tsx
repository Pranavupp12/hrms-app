import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmployeeModal } from "../../components/shared/EmployeeModal";
import { RejectLeaveModal } from "../../components/shared/RejectLeaveModal";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type {
  Employee,
  Salary,
  SentNotification,
  LeaveRequest,
  AppNotification,
  Attendance,
  AllUserAttendance,
  PunchStatus,
  AttendanceSheetData,
  Event
} from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../api";
import { MarkAttendanceModal } from "../../components/shared/MarkAttendanceModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalarySlipModal } from "../../components/shared/SalarySlipModal";
import { Sidebar } from "../../components/shared/SideBar";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal";
import { ManageUploadsModal } from "../../components/shared/ManageUploadsModal";
import { Calendar, FileText, Users, Send, DollarSign, Home, UserCheck } from "lucide-react";
import { Bell, LogOut, Clock, ChevronsUpDown, Check, X, Plane, Bed, Briefcase, Slice, CheckCircle, XCircle } from "lucide-react";
import { AddEventModal } from "@/components/shared/AddEventModal";
import CalendarComponent from "@/components/shared/AnimatedCalendar";
import { ApplyLeaveModal } from "../../components/shared/ApplyLeaveModal";
import { ViewCommentModal } from "../../components/shared/ViewCommentModal";

// Helper to format date from YYYY-MM-DD to DD/MM/YYYY
const formatDate = (dateString?: string) => {
  if (!dateString || dateString === '--') return '--';
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};

// Helper to format time from 24-hour to 12-hour AM/PM
const formatTime = (timeString?: string) => {
  if (!timeString || timeString === '--') return '--';
  try {
    const [hours, minutes] = timeString.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h || 12;
    const hStr = h < 10 ? '0' + h : h.toString();
    return `${hStr}:${minutes} ${ampm}`;
  } catch (error) {
    return timeString;
  }
};

//  new helper function for formatting the  sent time
const formatSentTime = (dateTimeString?: string) => {
  // This check is crucial for old records
  if (!dateTimeString) {
    return 'N/A';
  }
  try {
    const date = new Date(dateTimeString);
    // Check if the date is valid after creation
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return 'N/A';
  }
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];


export function AdminDashboard() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<(LeaveRequest & { employeeName: string; id: string })[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<(Salary & { employeeName: string; id: string })[]>([]);
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AppNotification[]>([]);
  const [adminAttendance, setAdminAttendance] = useState<Attendance[]>([]);
  const [adminSalaryHistory, setAdminSalaryHistory] = useState<Salary[]>([]);
  const [allUserAttendance, setAllUserAttendance] = useState<AllUserAttendance[]>([]);

  const [filteredAdminNotifications, setFilteredAdminNotifications] = useState<AppNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'today'>('all');
  const [sentHistoryFilter, setSentHistoryFilter] = useState<'all' | 'today'>('all');
  const [allAttendanceFilter, setAllAttendanceFilter] = useState<'today' | 'all'>('today');

  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationRecipients, setNotificationRecipients] = useState<string[]>(["all"]);
  const [salaryEmployeeIds, setSalaryEmployeeIds] = useState<string[]>([]);

  const [salaryMonth, setSalaryMonth] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [adminPunchStatus, setAdminPunchStatus] = useState<PunchStatus>('punched-out');

  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [mySalaryFilterYear, setMySalaryFilterYear] = useState('');
  const [mySalaryFilterMonth, setMySalaryFilterMonth] = useState('');

  const [selectedEmployeeForMarking, setSelectedEmployeeForMarking] = useState<string>('');
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [markingRecord, setMarkingRecord] = useState<Attendance | null>(null);

  const [attendanceSheetData, setAttendanceSheetData] = useState<{ dates: string[], sheet: AttendanceSheetData[] }>({ dates: [], sheet: [] });

  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [selectedSlipPath, setSelectedSlipPath] = useState<string | undefined>(undefined);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const [activeTab, setActiveTab] = useState("home");
  const [hasUnread, setHasUnread] = useState(false);

  const [isUploadsModalOpen, setIsUploadsModalOpen] = useState(false);
  const [employeeForUploads, setEmployeeForUploads] = useState<Employee | null>(null);

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [adminLeaveRequests, setAdminLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);





  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  const fetchData = async () => {
    try {
      const attendanceEndpoint = allAttendanceFilter === 'today'
        ? '/admin/attendance/today'
        : '/admin/attendance/all';

      const [
        employeesRes,
        leavesRes,
        salariesRes,
        sentNotificationsRes,
        adminNotificationsRes,
        adminAttendanceRes,
        allAttendanceRes,
        adminSalaryRes,
        attendanceSheetRes,
        eventRes,
        adminLeavesRes,
      ] = await Promise.all([
        api.get("/admin/employees"),
        api.get("/admin/leave-requests"),
        api.get("/admin/salaries"),
        api.get("/admin/notifications"),
        api.get(`/admin/${user.id}/notifications`),
        api.get(`/admin/${user.id}/attendance`),
        api.get(attendanceEndpoint),
        api.get(`/admin/${user.id}/salaries`),
        api.get('/admin/attendance-sheet'),
        api.get(`/events/${user.id}`),
        api.get(`/employees/${user.id}/leaves`),
      ]);

      setAllEmployees(employeesRes.data);
      setLeaveRequests(leavesRes.data);
      setSalaryHistory(salariesRes.data);
      setSentNotifications(sentNotificationsRes.data);
      setAdminNotifications(adminNotificationsRes.data);
      setAdminAttendance(adminAttendanceRes.data);
      setAllUserAttendance(allAttendanceRes.data);
      setAdminSalaryHistory(adminSalaryRes.data);
      setAttendanceSheetData(attendanceSheetRes.data);
      setAllEvents(eventRes.data);
      setAdminLeaveRequests(adminLeavesRes.data);

      const today = new Date().toISOString().slice(0, 10);
      const myTodaysAttendance = adminAttendanceRes.data.find((att: any) => att.date === today);
      if (myTodaysAttendance) {
        if (myTodaysAttendance.status === 'Absent') {
          setAdminPunchStatus('absent');
        } else if (myTodaysAttendance.checkOut && myTodaysAttendance.checkOut !== '--') {
          setAdminPunchStatus('completed');
        } else if (myTodaysAttendance.checkIn && myTodaysAttendance.checkIn !== '--') {
          setAdminPunchStatus('punched-in');
        } else {
          // This handles all other manual statuses like "Sick Leave", "Half Day", etc.
          setAdminPunchStatus('completed');
        }
      } else {
        setAdminPunchStatus('punched-out');
      }

      const unreadNotifications = adminNotificationsRes.data.some((n: any) => n.status === "unread");
      setHasUnread(unreadNotifications);

      const hasShownLoginToast = sessionStorage.getItem(
        "loginNotificationShown"
      );

      if (unreadNotifications && !hasShownLoginToast) {
        toast.info("You have new messages. Please check your notifications!");
        sessionStorage.setItem("loginNotificationShown", "true");
      }
    } catch (error) {
      toast.error("Failed to fetch dashboard data.");
    }
  };




  useEffect(() => {

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || user.role !== "Admin") {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user.id, navigate, allAttendanceFilter]);

  const filteredSalaryHistory = useMemo(() => {
    if (!filterYear && !filterMonth) {
      return salaryHistory;
    }
    return salaryHistory.filter(sal => {
      const period = sal.month.toLowerCase();
      const yearMatch = !filterYear || period.includes(filterYear);
      const monthMatch = !filterMonth || period.startsWith(filterMonth.toLowerCase());
      return yearMatch && monthMatch;
    });
  }, [salaryHistory, filterYear, filterMonth]);

  const availableYears = useMemo(() => {
    const years = new Set(salaryHistory.map(sal => sal.month.split(' ')[1]).filter(Boolean));
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [salaryHistory]);

  const filteredAdminSalaryHistory = useMemo(() => {
    if (!mySalaryFilterYear && !mySalaryFilterMonth) {
      return adminSalaryHistory;
    }
    return adminSalaryHistory.filter(sal => {
      const period = sal.month.toLowerCase();
      const yearMatch = !mySalaryFilterYear || period.includes(mySalaryFilterYear.toLowerCase());
      const monthMatch = !mySalaryFilterMonth || period.startsWith(mySalaryFilterMonth.toLowerCase());
      return yearMatch && monthMatch;
    });
  }, [adminSalaryHistory, mySalaryFilterYear, mySalaryFilterMonth]);

  const myAvailableYears = useMemo(() => {
    const years = new Set(adminSalaryHistory.map(sal => (sal.month.match(/\d{4}/)?.[0])).filter(Boolean));
    return Array.from(years).sort((a, b) => parseInt(b!) - parseInt(a!));
  }, [adminSalaryHistory]);

  const filteredSentHistory = useMemo(() => {
    if (sentHistoryFilter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      return sentNotifications.filter(n => n.date === today);
    }
    return sentNotifications;
  }, [sentNotifications, sentHistoryFilter]);

  const currentHour = currentTime.getHours();
  const isPunchInWindow = currentHour >= 9 && currentHour < 11;
  const hasMissedPunchIn = currentHour >= 11 && adminPunchStatus === 'punched-out';


  useEffect(() => {
    if (notificationFilter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      setFilteredAdminNotifications(adminNotifications.filter(n => n.date === today));
    } else {
      setFilteredAdminNotifications(adminNotifications);
    }
  }, [adminNotifications, notificationFilter]);

  const handleAdminPunchIn = async () => {
    try {
      await api.post(`/admin/${user.id}/punch-in`);
      setAdminPunchStatus('punched-in');
      toast.success("Punched in successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to punch in.");
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up the event listener when the component is unmounted
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  const handleAdminPunchOut = async () => {
    try {
      await api.post(`/admin/${user.id}/punch-out`);
      setAdminPunchStatus('completed');
      toast.info("Punched out successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to punch out.");
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const openViewModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const openSlipModal = (slipPath: string) => {
    setSelectedSlipPath(slipPath);
    setIsSlipModalOpen(true);
  };

  const handleSaveEmployee = async (formData: FormData) => {
    try {
      if (editingEmployee) {
        await api.put(`/admin/employees/${editingEmployee._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const role = editingEmployee.role;
        toast.success(`${role}'s info updated successfully.`);
      } else {
        await api.post("/admin/employees", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const role = formData.get("role");
        toast.success(`New ${role} added successfully.`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save employee.");
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    try {
      await api.put(`/admin/leave-requests/${leaveId}/approve`);
      fetchData();
      toast.success(`Leave request has been approved.`);
    } catch (error) {
      toast.error("Failed to approve leave request.");
    }
  };

  const handleRejectLeave = async (leaveId: string, reason: string) => {
    try {
      await api.put(`/admin/leave-requests/${leaveId}/reject`, {
        rejectionReason: reason,
      });
      fetchData();
      toast.error(`Leave request has been rejected.`);
    } catch (error) {
      toast.error("Failed to reject leave request.");
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  // This function performs the actual deletion after confirmation
  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      await api.delete(`/admin/employees/${employeeToDelete._id}`);
      fetchData();
      toast.info(`Employee "${employeeToDelete.name}" has been deleted.`);
    } catch (error) {
      toast.error("Failed to delete employee.");
    } finally {
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
    }
  };



  const handleSendNotification = async () => {

    if (!notificationMessage.trim()) {
      toast.error("Notification message cannot be empty.");
      return;
    }

    if (notificationRecipients.length === 0) {
      toast.error("Please select at least one recipient.");
      return;
    }

    try {
      const recipientData = notificationRecipients.includes('all') ? 'all' : notificationRecipients;

      await api.post("/admin/notifications", {
        recipient: recipientData,
        message: notificationMessage,
        senderId: user.id,
      });

      fetchData();
      toast.success(`Notification sent.`);
      setNotificationMessage("");
      setNotificationRecipients(['all']);
    } catch (error) {
      toast.error("Failed to send notification.");
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // 1. Immediately update the local list of notifications
      const updatedNotifications = adminNotifications.map(n =>
        n._id === notificationId ? { ...n, status: 'read' as 'read' } : n
      );
      setAdminNotifications(updatedNotifications);

      // 2. Recalculate the unread status from the updated local list
      const stillHasUnread = updatedNotifications.some(n => n.status === 'unread');
      setHasUnread(stillHasUnread);

      // 3. Send the update to the backend in the background
      await api.put(`/admin/${user.id}/notifications/${notificationId}`);

      toast.info("Notification marked as read.");
    } catch (error) {
      toast.error("Failed to mark notification as read.");
      // If the backend fails, refetch data to revert the optimistic update
      fetchData();
    }
  };

  const handleGenerateSlips = async () => {
    if (salaryEmployeeIds.length === 0 || !salaryMonth.trim()) {
      return toast.error("Please select employee(s) and a pay period.");
    }
    try {
      await api.post("/admin/generate-salary", {
        employeeIds: salaryEmployeeIds,
        month: salaryMonth,
      });
      fetchData();
      toast.success(`Salary slips are being generated for ${salaryEmployeeIds.length} employee(s).`);
      setSalaryEmployeeIds([]);
      setSalaryMonth("");
    } catch (error) {
      toast.error("Failed to generate salary slips.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("loginNotificationShown");
    toast.success("You have been logged out.");
    navigate("/login");
  };

  const handleManualMark = async (newStatus: string) => {
    if (!markingRecord || !selectedEmployeeForMarking) return;

    try {
      await api.put('/admin/attendance/manual-mark', {
        employeeId: selectedEmployeeForMarking,
        date: markingRecord.date,
        status: newStatus,
      });
      toast.success("Attendance marked successfully.");
      fetchData(); // Refresh all data
    } catch (error) {
      toast.error("Failed to mark attendance.");
    }
  };

  const employeeToMark = allEmployees.find(emp => emp._id === selectedEmployeeForMarking);


  const openUploadsModal = (employee: Employee) => {
    setEmployeeForUploads(employee);
    setIsUploadsModalOpen(true);
  };


  // ✅ NEW: Event handlers for the Home tab
  const handleCreateEvent = async (eventData: { title: string; description: string; date: string; time: string }) => {
    try { await api.post('/events', { ...eventData, employee: user.id }); toast.success("Event created successfully!"); fetchData(); }
    catch (error) { toast.error("Failed to create event."); }
  };
  const handleMarkEventAsComplete = async (eventId: string) => {
    try { setAllEvents(prev => prev.map(e => e._id === eventId ? { ...e, status: 'completed' } : e)); await api.put(`/events/${eventId}/status`); toast.success("Event marked as complete!"); }
    catch (error) { toast.error("Failed to update event status."); fetchData(); }
  };
  const handleDeleteEvent = async (eventId: string) => {
    try { setAllEvents(prev => prev.filter(e => e._id !== eventId)); await api.delete(`/events/${eventId}`); toast.success("Event deleted!"); }
    catch (error) { toast.error("Failed to delete event."); fetchData(); }
  };

  // ✅ NEW: `useMemo` hooks for Home tab data processing, same as HR dashboard
  const adminAttendanceStats = useMemo(() => {
    const stats = { presentDays: 0, absentDays: 0, sickLeaveDays: 0, paidLeaveDays: 0, shortLeaveDays: 0, halfDayLeaves: 0, totalDaysInMonth: 0 };
    const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
    stats.totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    adminAttendance.forEach(att => {
      const attDate = new Date(att.date);
      if (attDate.getFullYear() === year && attDate.getMonth() === month) {
        switch (att.status) {
          case 'Present': stats.presentDays++; break;
          case 'Absent': stats.absentDays++; break;
          case 'Sick Leave': stats.sickLeaveDays++; break;
          case 'Paid Leave': stats.paidLeaveDays++; break;
          case 'Short Leave': stats.shortLeaveDays++; break;
          case 'Half Day': stats.halfDayLeaves++; break;
        }
      }
    }); return stats;
  }, [adminAttendance]);


  // ✅ 3. Add the function to handle submitting a new leave request
  const handleApplyLeave = async (newLeaveRequest: Omit<LeaveRequest, '_id' | 'status' | 'id'>) => {
    try {
      await api.post(`/employees/${user.id}/leaves`, newLeaveRequest);
      toast.success("Leave request submitted successfully!");
      fetchData(); // Refresh all data to show the new request
    } catch (error) {
      toast.error("Failed to submit leave request.");
    }
  };

  const { todaysEvents, upcomingEvents } = useMemo(() => {
    const todayString = new Date().toISOString().slice(0, 10);
    const todays = allEvents.filter(event => event.date.slice(0, 10) === todayString);
    const upcoming = allEvents.filter(event => event.date.slice(0, 10) !== todayString);
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { todaysEvents: todays, upcomingEvents: upcoming };
  }, [allEvents]);

  const latestAdminLeave = useMemo(() => {
    if (!adminLeaveRequests || adminLeaveRequests.length === 0) return null;
    return [...adminLeaveRequests].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
  }, [adminLeaveRequests]);




  const adminTabs = [
    { name: "Home", icon: Home },
    { name: "Attendance", icon: Calendar },
    { name: "Leave Requests", icon: FileText },
    { name: "Employee Management", icon: Users },
    { name: "Send Notification", icon: Send },
    { name: "Salary Punch In", icon: DollarSign }
  ];


  return (
    <div className="flex h-screen bg-gray-50">
      <EmployeeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSaveEmployee} employee={editingEmployee} viewMode={isViewMode} />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteEmployee}
        title="Are you absolutely sure?"
        description={`This action cannot be undone. This will permanently delete the employee "${employeeToDelete?.name}".`}
      />
      <SalarySlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        slipPath={selectedSlipPath}
      />
      {markingRecord && employeeToMark && (
        <MarkAttendanceModal
          isOpen={isMarkingModalOpen}
          onClose={() => setIsMarkingModalOpen(false)}
          onSubmit={handleManualMark}
          employeeName={employeeToMark.name}
          role={employeeToMark.role}
          date={formatDate(markingRecord.date) || ''}
          currentStatus={markingRecord.status}
        />
      )}

      <ManageUploadsModal
        isOpen={isUploadsModalOpen}
        onClose={() => setIsUploadsModalOpen(false)}
        employee={employeeForUploads}
      />

      <AddEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} onSubmit={handleCreateEvent} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full">
        <Sidebar tabs={adminTabs} user={user} className="w-1/5 border-r" />

        <div className="flex-1 p-8 overflow-y-auto bg-blue-50">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-indigo-400">Welcome Admin, {user.name}!</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative"
                onClick={() => setActiveTab('send-notification')}
              >
                <Bell size={28} />
                {hasUnread && (
                  <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-indigo-400" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full"><LogOut /></Button>
            </div>
          </div>


          <TabsContent value="home" className="mt-4 space-y-6">
            <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6" /> Mark Your Attendance</CardTitle>
                <CardDescription className="text-white">{currentTime.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="text-6xl font-bold font-mono">
                  {currentTime.toLocaleTimeString("en-US")}
                </div>
                {adminPunchStatus === "punched-out" && !hasMissedPunchIn && (
                  <Button size="lg" className="w-48 bg-green text-white" onClick={handleAdminPunchIn} disabled={!isPunchInWindow}>
                    Punch In
                  </Button>
                )}

                {hasMissedPunchIn && (
                  <div className="text-center">
                    <p className="text-white font-semibold text-lg">You are Absent</p>
                    <p className="text-sm text-white text-muted-foreground">The punch-in window (9 AM - 11 AM) has closed.</p>
                  </div>
                )}

                {adminPunchStatus === "absent" && (
                  <div className="text-center">
                    <p className="text-white font-semibold text-lg">You have been marked Absent</p>
                    <p className="text-sm text-white text-muted-foreground">You did not punch in before 11 AM.</p>
                  </div>
                )}

                {adminPunchStatus === "punched-in" && (
                  <Button size="lg" variant="destructive" className="w-48" onClick={handleAdminPunchOut}>
                    Punch Out
                  </Button>
                )}
                {adminPunchStatus === "completed" && (
                  <p className="text-white font-semibold">
                    Your attendance for today has been completed.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid md:grid-cols-2 gap-6 p-4">
                <div className="rounded-md border p-4 flex items-center justify-center"><CalendarComponent showSelectedDateInfo={false} className="shadow-none p-0 border-0" /></div>
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center"><h3 className="font-semibold text-lg">Company Events</h3><Button size="default" onClick={() => setIsEventModalOpen(true)}>+ Add Event</Button></div>
                  <div>
                    <h4 className="font-semibold text-md mb-2 text-gray-800">Today</h4>
                    <div className="overflow-y-auto max-h-40 pr-3">{todaysEvents.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{todaysEvents.map(event => (<div key={event._id} className={`p-3 rounded-lg shadow-sm border flex flex-col h-24 transition-all ${event.status === 'completed' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-200'}`}><div className="flex justify-between items-start flex-grow"><p className={`font-bold text-sm break-words ${event.status === 'completed' ? 'text-green-800 line-through' : 'text-blue-800'}`}>{event.title}</p><div className="flex items-center space-x-0.5 ml-1 flex-shrink-0">{event.status !== 'completed' && <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-200 hover:text-green-700" onClick={() => handleMarkEventAsComplete(event._id)}><Check size={14} /></Button>}<Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-200 hover:text-red-700" onClick={() => handleDeleteEvent(event._id)}><X size={14} /></Button></div></div><p className={`text-xs self-end ${event.status === 'completed' ? 'text-green-600' : 'text-blue-700'}`}>{formatTime(event.time)}</p></div>))}</div> : <p className="text-sm text-muted-foreground text-center py-4">No events for today.</p>}</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-md mb-2 text-gray-800">Upcoming</h4>
                    <div className="overflow-y-auto max-h-40 pr-3">{upcomingEvents.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{upcomingEvents.map(event => (<div key={event._id} className={`p-3 rounded-lg shadow-sm border flex flex-col h-24 transition-all ${event.status === 'completed' ? 'bg-green-100 border-green-300' : 'bg-yellow-100 border-yellow-200'}`}><div className="flex justify-between items-start flex-grow"><p className={`font-bold text-sm break-words ${event.status === 'completed' ? 'text-green-800 line-through' : 'text-yellow-800'}`}>{event.title}</p><div className="flex items-center space-x-0.5 ml-1 flex-shrink-0"><Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-200 hover:text-red-700" onClick={() => handleDeleteEvent(event._id)}><X size={14} /></Button></div></div><p className={`text-xs self-end ${event.status === 'completed' ? 'text-green-600' : 'text-yellow-700'}`}>{formatDate(event.date)}</p></div>))}</div> : <p className="text-sm text-muted-foreground text-center py-4">No upcoming events.</p>}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-100"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-lg font-medium">Total Days</CardTitle><Calendar /></CardHeader><CardContent><div className="text-7xl">{adminAttendanceStats.totalDaysInMonth}</div></CardContent></Card>
                <Card className="bg-green-100"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-lg font-medium">Present</CardTitle><CheckCircle /></CardHeader><CardContent><div className="text-7xl">{adminAttendanceStats.presentDays}</div></CardContent></Card>
                <Card className="bg-red-100"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-lg font-medium">Absent</CardTitle><XCircle /></CardHeader><CardContent><div className="text-7xl">{adminAttendanceStats.absentDays}</div></CardContent></Card>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-yellow-100"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-lg font-medium">Sick Leave</CardTitle><Bed /></CardHeader><CardContent><div className="text-7xl">{adminAttendanceStats.sickLeaveDays}</div></CardContent></Card>
                <Card className="bg-indigo-100"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-lg font-medium">Paid Leave</CardTitle><Plane /></CardHeader><CardContent><div className="text-7xl">{adminAttendanceStats.paidLeaveDays}</div></CardContent></Card>
                <Card className="bg-purple-100"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-lg font-medium">Half Day</CardTitle><Slice /></CardHeader><CardContent><div className="text-7xl">{adminAttendanceStats.halfDayLeaves}</div></CardContent></Card>
                <Card className="bg-pink-100"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-lg font-medium">Short Leave</CardTitle><Briefcase /></CardHeader><CardContent><div className="text-7xl">{adminAttendanceStats.shortLeaveDays}</div></CardContent></Card>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>My Applied Leaves</CardTitle></CardHeader>
                <CardContent>{adminLeaveRequests.length > 0 ? <ul className="space-y-2">{Object.entries(adminLeaveRequests.reduce((acc, leave) => { acc[leave.type] = (acc[leave.type] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([type, count]) => (<li key={type} className="flex justify-between"><span>{type}</span><Badge>{count}</Badge></li>))}</ul> : <p className="text-sm text-muted-foreground">No leave requests found.</p>}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>My Last Leave Application</CardTitle></CardHeader>
                <CardContent>{latestAdminLeave ? <div className="space-y-2"><div className="flex justify-between"><span className="font-semibold">Type:</span><span>{latestAdminLeave.type}</span></div><div className="flex justify-between"><span className="font-semibold">Start Date:</span><span>{formatDate(latestAdminLeave.startDate)}</span></div><div className="flex justify-between"><span className="font-semibold">End Date:</span><span>{formatDate(latestAdminLeave.endDate)}</span></div><div className="flex justify-between"><span className="font-semibold">Status:</span><Badge>{latestAdminLeave.status}</Badge></div></div> : <p className="text-sm text-muted-foreground">No leave applications found.</p>}</CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-4 space-y-6">
            <Card>
              <CardHeader><CardTitle>My Attendance Record</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminAttendance.map((att, index) => (
                      <TableRow key={`my-att-${att.date}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{formatDate(att.date)}</TableCell>
                        <TableCell>{formatTime(att.checkIn)}</TableCell>
                        <TableCell>{formatTime(att.checkOut)}</TableCell>
                        <TableCell><Badge variant={att.status === "Present" || att.status === "Sick Leave" || att.status === "Paid Leave" || att.status === "Short Leave" || att.status === "Half Day" ? "default" : "destructive"} className="whitespace-nowrap">{att.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All User Attendance</CardTitle>
                  <div className="space-x-2">
                    <Button size="default" variant={allAttendanceFilter === "all" ? "default" : "outline"} onClick={() => setAllAttendanceFilter("all")}>All</Button>
                    <Button size="default" variant={allAttendanceFilter === "today" ? "default" : "outline"} onClick={() => setAllAttendanceFilter("today")}>Today</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUserAttendance.map((att, index) => (
                      <TableRow key={`${att.employeeName}-${att.date}-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{att.employeeName}</TableCell>
                        <TableCell><Badge variant="secondary">{att.role}</Badge></TableCell>
                        <TableCell>{formatDate(att.date)}</TableCell>
                        <TableCell>{formatTime(att.checkIn)}</TableCell>
                        <TableCell>{formatTime(att.checkOut)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              att.status === "Present" || att.status === "Sick Leave" || att.status === "Paid Leave" || att.status === "Short Leave" || att.status === "Half Day" ? "default"
                                : att.status === "Punched In" ? "default"
                                  : att.status === "Absent" ? "destructive"
                                    : "outline"
                            }
                            className={`whitespace-nowrap ${att.status === "Not Punched In" ? "bg-gray-200 text-gray-700" : ""}`}
                          >
                            {att.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Manual Marking</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="w-1/3">
                  <Label>Select Employee</Label>
                  <Select value={selectedEmployeeForMarking} onValueChange={setSelectedEmployeeForMarking}>
                    <SelectTrigger><SelectValue placeholder="Select an employee..." /></SelectTrigger>
                    <SelectContent>
                      {allEmployees.map(emp => <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {employeeToMark && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeToMark.attendance.map(att => (
                        <TableRow key={att._id}>
                          <TableCell>{formatDate(att.date)}</TableCell>
                          <TableCell><Badge>{att.status}</Badge></TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => { setMarkingRecord(att); setIsMarkingModalOpen(true); }}>Mark</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Attendance Sheet</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Employee</TableHead>
                      {attendanceSheetData.dates.map(date => <TableHead key={date}>{formatDate(date)}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceSheetData.sheet.map(row => (
                      <TableRow key={row.employeeId}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {row.employeeName}
                          <p className="text-xs text-muted-foreground">({row.employeeId})</p>
                        </TableCell>
                        {attendanceSheetData.dates.map(date => (
                          <TableCell key={date}>
                            {row.attendance[date] ? (
                              <Badge variant={
                                row.attendance[date] === "Present" || row.attendance[date] === "Sick Leave" || row.attendance[date] === "Paid Leave" || row.attendance[date] === "Short Leave" || row.attendance[date] === "Half Day" ? "default"
                                  : row.attendance[date] === "Absent" ? "destructive"
                                    : "outline"
                              } className="whitespace-nowrap">
                                {row.attendance[date]}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave-requests" className="mt-4 space-y-6">
            <Card>
              <CardHeader><CardTitle>Pending Leave Requests</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((req, index) => (
                      <TableRow key={req.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{req.employeeName}</TableCell>
                        <TableCell>{req.type}</TableCell>
                        <TableCell>{formatDate(req.startDate)} to {formatDate(req.endDate)}</TableCell>
                        <TableCell className="max-w-xs truncate">{req.reason || "N/A"}</TableCell>
                        <TableCell><Badge variant={req.status == "Pending" || req.status == "Approved" ? "default" : "destructive"}>{req.status}</Badge></TableCell>
                        <TableCell className="space-x-2">
                          {req.status === "Pending" && (
                            <>
                              <Button size="sm" onClick={() => handleApproveLeave(req.id)}>Approve</Button>
                              <RejectLeaveModal onSubmit={(reason) => handleRejectLeave(req.id, reason)}>
                                <Button size="sm" variant="destructive">Reject</Button>
                              </RejectLeaveModal>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Leave Requests</CardTitle>
                <ApplyLeaveModal onSubmit={handleApplyLeave}>
                  <Button>Apply for Leave</Button>
                </ApplyLeaveModal>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminLeaveRequests.length > 0 ? (
                      adminLeaveRequests.map((req, index) => (
                        <TableRow key={req._id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{req.type}</TableCell>
                          <TableCell>{formatDate(req.startDate)}</TableCell>
                          <TableCell>{formatDate(req.endDate)}</TableCell>
                          <TableCell><Badge variant={req.status === "Pending" ? "default" : req.status === "Approved" ? "default" : "destructive"}>{req.status}</Badge></TableCell>
                          <TableCell>
                            {req.status === 'Rejected' && req.rejectionReason && (
                              <ViewCommentModal reason={req.rejectionReason}>
                                <Button variant="outline" size="sm">View Comment</Button>
                              </ViewCommentModal>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">You have not applied for any leave.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employee-management" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Employees</CardTitle>
                <Button onClick={openAddModal}>Add Employee</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEmployees.map((emp, index) => (
                      <TableRow key={emp._id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell><Badge>{emp.role}</Badge></TableCell>
                        <TableCell className="space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openViewModal(emp)}>View</Button>
                          <Button variant="outline" size="sm" onClick={() => openEditModal(emp)}>Update</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(emp)}>Delete</Button>
                          <Button variant="secondary" size="sm" onClick={() => openUploadsModal(emp)}>Manage Uploads</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send-notification" className="mt-4 space-y-6">
            <Card>
              <CardHeader><CardTitle>Send a New Notification</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recipient">Recipient</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10">
                        <div className="flex gap-1 flex-wrap">
                          {notificationRecipients.includes('all') ? <Badge>All Employees</Badge> : allEmployees.filter(emp => notificationRecipients.includes(emp._id)).map(emp => <Badge key={emp._id}>{emp.name}</Badge>)}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search employees..." />
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => setNotificationRecipients(['all'])}>All Employees</CommandItem>
                            {allEmployees.map((employee) => (
                              <CommandItem key={employee._id} onSelect={() => {
                                const newSelection = notificationRecipients.includes('all') ? [employee._id] : notificationRecipients.includes(employee._id) ? notificationRecipients.filter((id) => id !== employee._id) : [...notificationRecipients, employee._id];
                                setNotificationRecipients(newSelection.length === 0 ? ['all'] : newSelection);
                              }}>
                                {employee.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Type your notification here..." value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} />
                </div>
                <Button onClick={handleSendNotification}>Send Notification</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sent Notifications History</CardTitle>
                <div className="space-x-2">
                  <Button size="default" variant={sentHistoryFilter === 'all' ? 'default' : 'outline'} onClick={() => setSentHistoryFilter('all')}>All</Button>
                  <Button size="default" variant={sentHistoryFilter === 'today' ? 'default' : 'outline'} onClick={() => setSentHistoryFilter('today')}>Today</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Sent By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSentHistory.length > 0 ?
                      (filteredSentHistory.map((notif, index) => (
                        <TableRow key={notif._id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(notif.date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatSentTime(notif.sentAt)}</TableCell>
                          <TableCell className="max-w-md truncate">{notif.message}</TableCell>
                          <TableCell>{notif.recipient}</TableCell>
                          <TableCell>{notif.sentBy ? `${notif.sentBy.name} (${notif.sentBy.role})` : 'N/A'}</TableCell>
                        </TableRow>
                      ))) : (<TableRow>
                        <TableCell colSpan={6} className="text-sm text-muted-foreground text-center">
                          You have no new notifications for this period.
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5" /> My Notifications</CardTitle>
                  <div className="space-x-2">
                    <Button size="default" variant={notificationFilter === 'all' ? 'default' : 'outline'} onClick={() => setNotificationFilter('all')}>All</Button>
                    <Button size="default" variant={notificationFilter === 'today' ? 'default' : 'outline'} onClick={() => setNotificationFilter('today')}>Today</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredAdminNotifications.length > 0 ? (
                    filteredAdminNotifications.map((notification) => (
                      <div key={notification._id} className="flex items-start justify-between p-4 rounded-lg border bg-indigo-50 border-indigo-200">
                        <div className="flex items-start space-x-4">
                          <span className={`mt-1.5 h-2 w-2 rounded-full ${notification.status === "unread" ? "bg-blue-500" : "bg-indigo-200"}`} />
                          <div className="flex flex-col">
                            <p className={`text-sm ${notification.status === "unread" ? "font-semibold text-primary" : "text-muted-foreground"}`}>{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.date)}</p>
                            {notification.sentBy && <p className="text-xs font-semibold text-muted-foreground mt-1">- {notification.sentBy.name} ({notification.sentBy.role})</p>}
                          </div>
                        </div>
                        {notification.status === "unread" && <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification._id)}>Mark as Read</Button>}
                      </div>
                    ))
                  ) : <p className="text-sm text-muted-foreground text-center">You have no new notifications for this period.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary-punch-in" className="mt-4 space-y-6">
            <Card>
              <CardHeader><CardTitle>Generate Salary Slips</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="salary-employee">Select Employee(s)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10">
                        <div className="flex gap-1 flex-wrap">
                          {salaryEmployeeIds.length > 0 ? allEmployees.filter(emp => salaryEmployeeIds.includes(emp._id)).map(emp => <Badge key={emp._id}>{emp.name}</Badge>) : <span>Select employee(s)...</span>}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search employees..." />
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            {allEmployees.map((employee) => (
                              <CommandItem key={employee._id} onSelect={() => {
                                const newSelection = salaryEmployeeIds.includes(employee._id) ? salaryEmployeeIds.filter((id) => id !== employee._id) : [...salaryEmployeeIds, employee._id];
                                setSalaryEmployeeIds(newSelection);
                              }}>
                                {employee.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="salary-month">Pay Period (e.g., October 2025)</Label>
                  <Input id="salary-month" type="text" placeholder="Enter month and year..." value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)} />
                </div>
                <Button onClick={handleGenerateSlips}>Generate Slips</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Salary History</CardTitle>
                <div className="flex items-center gap-2">
                  <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="p-2 border rounded bg-background text-sm">
                    <option value="">Filter by Month...</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="p-2 border rounded bg-background text-sm">
                    <option value="">Filter by Year...</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <Button variant="outline" size="default" onClick={() => { setFilterMonth(''); setFilterYear(''); }}>Clear</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Salary Period</TableHead>
                      <TableHead>Date Punched</TableHead>
                      <TableHead>View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalaryHistory.map((sal, index) => (
                      <TableRow key={sal.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{sal.employeeName}</TableCell>
                        <TableCell>{sal.month}</TableCell>
                        <TableCell>{formatDate(sal.date)}</TableCell>
                        <TableCell>
                          {sal.slipPath && <Button variant="outline" size="sm" onClick={() => openSlipModal(sal.slipPath!)}>View Slip</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Salary History</CardTitle>
                <div className="flex items-center gap-2">
                  <select value={mySalaryFilterMonth} onChange={(e) => setMySalaryFilterMonth(e.target.value)} className="p-2 border rounded bg-background text-sm">
                    <option value="">Filter by Month...</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={mySalaryFilterYear} onChange={(e) => setMySalaryFilterYear(e.target.value)} className="p-2 border rounded bg-background text-sm">
                    <option value="">Filter by Year...</option>
                    {myAvailableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <Button variant="outline" size="default" onClick={() => { setMySalaryFilterMonth(''); setMySalaryFilterYear(''); }}>Clear</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Punched</TableHead>
                      <TableHead>View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminSalaryHistory.map((sal, index) => (
                      <TableRow key={sal._id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{sal.month}</TableCell>
                        <TableCell>₹{sal.amount.toLocaleString()}</TableCell>
                        <TableCell><Badge>{sal.status}</Badge></TableCell>
                        <TableCell>{formatDate(sal.date)}</TableCell>
                        <TableCell>
                          {sal.slipPath && <Button variant="outline" size="sm" onClick={() => openSlipModal(sal.slipPath!)}>View Slip</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

