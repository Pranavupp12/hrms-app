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
  AttendanceSheetData
} from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../api";
import { Bell, LogOut, Clock, ChevronsUpDown } from "lucide-react";
import { MarkAttendanceModal } from "../../components/shared/MarkAttendanceModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalarySlipModal } from "../../components/shared/SalarySlipModal";
import { Sidebar } from "../../components/shared/SideBar"; 
import { ConfirmationModal } from "../../components/shared/ConfirmationModal";
import { ManageUploadsModal } from "../../components/shared/ManageUploadsModal";



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

  const [activeTab, setActiveTab] = useState("attendance");
  const [hasUnread, setHasUnread] = useState(false);

  const [isUploadsModalOpen, setIsUploadsModalOpen] = useState(false);
  const [employeeForUploads, setEmployeeForUploads] = useState<Employee | null>(null);
  

  


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

      const unreadNotifications = adminNotificationsRes.data.some((n: any) => n.status === "unread" );
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
    if (!user?.id || user.role !== "Admin") {
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


  const adminTabs = [
    "Attendance",
    "Leave Requests",
    "Employee Management",
    "Send Notification",
    "Salary Punch In"
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full">
        <Sidebar tabs={adminTabs} user={user}  className="w-1/5 border-r" />

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Welcome Admin, {user.name}!</h1>
              <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative"
                onClick={() => setActiveTab('send-notification')}
              >
                <Bell size={28} />
                {hasUnread && (
                  <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
                )}
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="rounded-full"><LogOut /></Button>
            </div>
          </div>

          <TabsContent value="attendance" className="mt-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Clock className="mr-2 h-6 w-6" /> Mark Your Attendance
                    </CardTitle>
                    <CardDescription>
                        {currentTime.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    <div className="text-6xl font-bold font-mono">{currentTime.toLocaleTimeString("en-US")}</div>
                    
                    {adminPunchStatus === "punched-out" && !hasMissedPunchIn && (
                        <Button size="lg" className="w-48" onClick={handleAdminPunchIn} disabled={!isPunchInWindow}>Punch In</Button>
                    )}

                    {hasMissedPunchIn && (
                        <div className="text-center">
                            <p className="text-red-600 font-semibold text-lg">You are Absent</p>
                            <p className="text-sm text-muted-foreground">The punch-in window (9 AM - 11 AM) has closed.</p>
                        </div>
                    )}
                    
                    {adminPunchStatus === "absent" && (
                        <div className="text-center">
                            <p className="text-red-600 font-semibold text-lg">You have been marked Absent</p>
                            <p className="text-sm text-muted-foreground">You did not punch in before 11 AM.</p>
                        </div>
                    )}

                    {adminPunchStatus === "punched-in" && (
                        <Button size="lg" variant="destructive" className="w-48" onClick={handleAdminPunchOut}>Punch Out</Button>
                    )}

                    {adminPunchStatus === "completed" && (
                        <p className="text-green-600 font-semibold">Your attendance for today has been completed.</p>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>My Attendance Record</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Check-In</TableHead>
                                <TableHead>Check-Out</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {adminAttendance.map((att) => (
                                <TableRow key={`my-att-${att.date}`}>
                                    <TableCell>{formatDate(att.date)}</TableCell>
                                    <TableCell>{formatTime(att.checkIn)}</TableCell>
                                    <TableCell>{formatTime(att.checkOut)}</TableCell>
                                    <TableCell><Badge variant={ att.status === "Present" || att.status === "Sick Leave" || att.status === "Paid Leave" || att.status === "Short Leave" || att.status === "Half Day" ? "default" : "destructive"}  className="whitespace-nowrap">{att.status}</Badge></TableCell>
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
                            <Button size="sm" variant={allAttendanceFilter === "all" ? "default" : "outline"} onClick={() => setAllAttendanceFilter("all")}>All</Button>
                            <Button size="sm" variant={allAttendanceFilter === "today" ? "default" : "outline"} onClick={() => setAllAttendanceFilter("today")}>Today</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
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

          <TabsContent value="leave-requests" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Pending Leave Requests</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{req.employeeName}</TableCell>
                        <TableCell>{req.type}</TableCell>
                        <TableCell>{formatDate(req.startDate)} to {formatDate(req.endDate)}</TableCell>
                        <TableCell className="max-w-xs truncate">{req.reason || "N/A"}</TableCell>
                        <TableCell><Badge variant={req.status == "Pending" || req.status == "Approved" ? "default":"destructive"}>{req.status}</Badge></TableCell>
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
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEmployees.map((emp) => (
                      <TableRow key={emp._id}>
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
                  <Button size="sm" variant={sentHistoryFilter === 'all' ? 'default' : 'outline'} onClick={() => setSentHistoryFilter('all')}>All</Button>
                  <Button size="sm" variant={sentHistoryFilter === 'today' ? 'default' : 'outline'} onClick={() => setSentHistoryFilter('today')}>Today</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Sent By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSentHistory.map((notif) => (
                      <TableRow key={notif._id}>
                        <TableCell className="whitespace-nowrap">{formatDate(notif.date)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatSentTime(notif.sentAt)}</TableCell>
                        <TableCell className="max-w-md truncate">{notif.message}</TableCell>
                        <TableCell>{notif.recipient}</TableCell>
                        <TableCell>{notif.sentBy ? `${notif.sentBy.name} (${notif.sentBy.role})` : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5" /> My Notifications</CardTitle>
                  <div className="space-x-2">
                    <Button size="sm" variant={notificationFilter === 'all' ? 'default' : 'outline'} onClick={() => setNotificationFilter('all')}>All</Button>
                    <Button size="sm" variant={notificationFilter === 'today' ? 'default' : 'outline'} onClick={() => setNotificationFilter('today')}>Today</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredAdminNotifications.length > 0 ? (
                    filteredAdminNotifications.map((notification) => (
                      <div key={notification._id} className="flex items-start justify-between p-4 rounded-lg border">
                        <div className="flex items-start space-x-4">
                          <span className={`mt-1.5 h-2 w-2 rounded-full ${notification.status === "unread" ? "bg-blue-500" : "bg-gray-300"}`} />
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
                  <Button variant="outline" size="sm" onClick={() => { setFilterMonth(''); setFilterYear(''); }}>Clear</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Salary Period</TableHead>
                      <TableHead>Date Punched</TableHead>
                      <TableHead>View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalaryHistory.map((sal) => (
                      <TableRow key={sal.id}>
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
                  <Button variant="outline" size="sm" onClick={() => { setMySalaryFilterMonth(''); setMySalaryFilterYear(''); }}>Clear</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Punched</TableHead>
                      <TableHead>View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminSalaryHistory.map((sal) => (
                      <TableRow key={sal._id}>
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

