import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { PunchStatus, Employee, LeaveRequest, AppNotification, Event, Salary, Task } from "@/types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApplyLeaveModal } from "@/components/shared/ApplyLeaveModal";
import { Bell, LogOut, Check, X, Clock } from "lucide-react";
import { ViewCommentModal } from "@/components/shared/ViewCommentModal";
import api from '@/api';
import { SalarySlipModal } from "../../components/shared/SalarySlipModal";
import { Calendar, FileText, DollarSign, CalendarDays, CheckCircle, XCircle, Briefcase, Bed, Plane, Slice, Home } from "lucide-react";
import CalendarComponent from "@/components/shared/AnimatedCalendar";
import { AddEventModal } from "@/components/shared/AddEventModal";
import { MSidebar } from "../../components/shared/modern-side-bar";
import { socket } from '../../socket';
import { PaginationControls } from "../../components/shared/PaginationControls";
import { Separator } from "@/components/ui/separator";
import { ViewTaskModal } from "../../components/shared/ViewTaskModal";
import { Loader2 } from "lucide-react";

const RECORDS_PER_PAGE = 10;

// Helper functions
const formatDate = (dateString?: string) => {
  if (!dateString || dateString === '--' || dateString === '') return 'N/A';
  try {
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};

const formatTime = (timeString?: string) => {
  if (!timeString || timeString === '--') return '--';
  try {
    const [hours, minutes] = timeString.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const hStr = h < 10 ? '0' + h : h.toString();
    return `${hStr}:${minutes} ${ampm}`;
  } catch (error) {
    return timeString;
  }
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [filteredNotifications, setFilteredNotifications] = useState<AppNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'today'>('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchStatus, setPunchStatus] = useState<PunchStatus>('punched-out');
  const navigate = useNavigate();

  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [selectedSlipPath, setSelectedSlipPath] = useState<string | undefined>(undefined);

  const [activeTab, setActiveTab] = useState("home");
  const [hasUnread, setHasUnread] = useState(false);


  const [events, setEvents] = useState<Event[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // ✅ New Task State
  const [personalTasks, setPersonalTasks] = useState<Task[]>([]);
  const [isViewTaskModalOpen, setIsViewTaskModalOpen] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [isLeaveSubmitting, setIsLeaveSubmitting] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // ✅ 3. Add state for pagination
  const [pagination, setPagination] = useState({
    myAttendance: 1,
    myLeaveRequests: 1,
    mySalary: 1,
    myNotifications: 1,
  });

  const handlePageChange = (table: keyof typeof pagination, page: number) => {
    setPagination(prev => ({ ...prev, [table]: page }));
  };

  const currentHour = currentTime.getHours();
  const isPunchInWindow = currentHour >= 9 && currentHour < 11;
  const hasMissedPunchIn = currentHour >= 11 && punchStatus === 'punched-out';



  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [attendanceRes, salaryRes, leavesRes, notificationsRes, eventsRes, userTaskRes] = await Promise.all([
        api.get(`/employees/${user.id}/attendance`),
        api.get(`/employees/${user.id}/salaries`),
        api.get(`/employees/${user.id}/leaves`),
        api.get(`/employees/${user.id}/notifications`),
        api.get(`/events/${user.id}`),
        api.get(`/tasks/user/${user.id}`),
      ]);

      setEvents(eventsRes.data);
      setPersonalTasks(userTaskRes.data);

      const unread = notificationsRes.data.some((n: any) => n.status === 'unread');
      setHasUnread(unread);

      const hasShownLoginToast = sessionStorage.getItem("loginNotificationShown");
      if (unread && !hasShownLoginToast) {
        toast.info("You have new messages. Please check your notifications!");
        sessionStorage.setItem("loginNotificationShown", "true");
      }

      const today = new Date().toISOString().slice(0, 10);
      const todaysAttendance = attendanceRes.data.find((att: any) => att.date === today);
      if (todaysAttendance) {
        if (todaysAttendance.status === 'Absent') {
          setPunchStatus('absent');
        } else if (todaysAttendance.checkOut && todaysAttendance.checkOut !== '--') {
          setPunchStatus('completed');
        } else if (todaysAttendance.checkIn && todaysAttendance.checkIn !== '--') {
          setPunchStatus('punched-in');
        } else {
          setPunchStatus('completed');
        }
      } else {
        setPunchStatus('punched-out');
      }

      setEmployee({
        _id: user.id, id: user.id, name: user.name, email: user.email, role: user.role,
        attendance: attendanceRes.data,
        salaryHistory: salaryRes.data,
        leaveRequests: leavesRes.data,
        notifications: notificationsRes.data,
      });

    } catch (error) {
      toast.error('Failed to fetch employee data.');
      console.error(error);
    }
  }, [user.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ 1. Get auth data at the top level of the component
  const token = localStorage.getItem('token');

  // ✅ 2. Perform the check BEFORE the main return statement
  if (!token || !user?.role || user.role !== "Employee") {
    // useEffect is needed to schedule navigation after the initial render phase
    useEffect(() => {
      navigate("/login");
    }, [navigate]);

    // ✅ 3. Return null to prevent the dashboard from rendering
    return null;
  }
  useEffect(() => {
    fetchData();
  }, [user.id]);

  useEffect(() => { handlePageChange('mySalary', 1); }, [filterYear, filterMonth]);
  useEffect(() => { handlePageChange('myNotifications', 1); }, [notificationFilter]);

  useEffect(() => {
    if (employee?.notifications) {
      if (notificationFilter === 'today') {
        const today = new Date().toISOString().slice(0, 10);
        setFilteredNotifications(employee.notifications.filter(n => n.date === today));
      } else {
        setFilteredNotifications(employee.notifications);
      }
    }
  }, [employee, notificationFilter]);

  useEffect(() => {
    // Join a private room for this employee's ID
    if (user.id) {
      socket.emit('join_room', user.id);
    }

    // --- Web Socket Event Listeners for Employee ---

    // 1. Listen for personal notifications sent to this employee
    const handleNewNotification = (newNotification: AppNotification) => {
      toast.info(`New notification: ${newNotification.message}`);
      //setEmployee(prev => prev ? { ...prev, notifications: [newNotification, ...prev.notifications] } : null);
      fetchData();
      setHasUnread(true);
    };
    socket.on('new_notification', handleNewNotification);

    // 2. Listen for updates to THEIR OWN leave requests
    const handleLeaveStatusUpdate = (updatedLeaveRequest: LeaveRequest) => {
      toast.info(`Your leave request status has been updated to "${updatedLeaveRequest.status}"`);
      // Find and update the specific leave request in the state
      setEmployee(prev => {
        if (!prev) return null;
        const updatedRequests = prev.leaveRequests.map(req =>
          req._id === updatedLeaveRequest._id ? updatedLeaveRequest : req
        );
        return { ...prev, leaveRequests: updatedRequests };
      });
    };
    socket.on('leave_status_updated', handleLeaveStatusUpdate);

    const handleNewSalaryRecord = (newRecord: Salary) => {
      toast.success("Your new salary slip has been generated!");
      setEmployee(prev => {
        if (!prev) return null;
        return {
          ...prev,
          salaryHistory: [newRecord, ...prev.salaryHistory]
        };
      });
    };
    socket.on('new_salary_record', handleNewSalaryRecord);

    // ✅ Task Listener
    const handlePersonalTaskUpdate = () => {
      api.get(`/tasks/user/${user.id}`).then(res => setPersonalTasks(Array.isArray(res.data) ? res.data : []));
    };
    socket.on('personal_task_update', handlePersonalTaskUpdate);


    // --- Cleanup Listeners ---
    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('leave_status_updated', handleLeaveStatusUpdate);
      socket.off('new_salary_record', handleNewSalaryRecord);
      socket.off('personal_task_update', handlePersonalTaskUpdate);
    };
  }, [user.id, fetchData]);


  const attendanceStats = useMemo(() => {
    const stats = {
      presentDays: 0,
      absentDays: 0,
      sickLeaveDays: 0,
      paidLeaveDays: 0,
      shortLeaveDays: 0,
      halfDayLeaves: 0,
      totalDaysInMonth: 0
    };
    if (!employee) return stats;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    stats.totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    employee.attendance.forEach(att => {
      const attDate = new Date(att.date);
      if (attDate.getFullYear() === year && attDate.getMonth() === month) {
        switch (att.status) {
          case 'Present':
            stats.presentDays++;
            break;
          case 'Absent':
            stats.absentDays++;
            break;
          case 'Sick Leave':
            stats.sickLeaveDays++;
            break;
          case 'Paid Leave':
            stats.paidLeaveDays++;
            break;
          case 'Short Leave':
            stats.shortLeaveDays++;
            break;
          case 'Half Day':
            stats.halfDayLeaves++;
            break;
          default:
            break;
        }
      }
    });
    return stats;
  }, [employee]);

  // ✅ THIS IS THE CORRECTED LOGIC
  const { todaysEvents, upcomingEvents } = useMemo(() => {
    const todayString = new Date().toISOString().slice(0, 10);

    // Only include events where the date is EXACTLY today
    const todays = events.filter(event => event.date.slice(0, 10) === todayString);

    // Only include events where the date is strictly IN THE FUTURE
    const upcoming = events.filter(event => event.date.slice(0, 10) > todayString);

    // Sort upcoming events chronologically
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { todaysEvents: todays, upcomingEvents: upcoming };
  }, [events]);

  const sortedPersonalTasks = useMemo(() => {
    return [...personalTasks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [personalTasks]);

  // ✅ THIS IS THE UPDATED LOGIC
  const latestLeave = useMemo(() => {
    if (!employee || !employee.leaveRequests || employee.leaveRequests.length === 0) return null;

    // Sort by the `_id` in descending order
    return [...employee.leaveRequests].sort((a, b) => {
      if (a._id > b._id) return -1;
      if (a._id < b._id) return 1;
      return 0;
    })[0];
  }, [employee]);

  const filteredSalaryHistory = useMemo(() => {
    if (!employee) return [];
    if (!filterYear && !filterMonth) {
      return employee.salaryHistory;
    }
    return employee.salaryHistory.filter(sal => {
      const period = sal.month.toLowerCase();
      const yearMatch = !filterYear || period.includes(filterYear.toLowerCase());
      const monthMatch = !filterMonth || period.startsWith(filterMonth.toLowerCase());
      return yearMatch && monthMatch;
    });
  }, [employee, filterYear, filterMonth]);

  const availableYears = useMemo(() => {
    if (!employee) return [];
    const years = employee.salaryHistory
      .map(sal => (sal.month.match(/\d{4}/)?.[0]))
      .filter((year): year is string => !!year);
    return Array.from(new Set(years)).sort((a, b) => parseInt(b) - parseInt(a));
  }, [employee]);

  const handlePunchIn = async () => {
    setPunchStatus('punched-in');
    toast.success("Punched in successfully!");
    try {
      await api.post(`/employees/${user.id}/punch-in`);
      fetchData();
    } catch (error) {
      toast.error("Failed to punch in. Please try again.");
      setPunchStatus('punched-out');
    }
  };

  const handlePunchOut = async () => {
    setPunchStatus('completed');
    toast.info("Punched out successfully!");
    try {
      await api.post(`/employees/${user.id}/punch-out`);
      fetchData();
    } catch (error) {
      toast.error("Failed to punch out.");
      setPunchStatus('punched-in'); // Revert on failure
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('loginNotificationShown');
    toast.success("You have been logged out.");
    navigate('/login');
  };

  const handleLeaveSubmit = async (newLeaveRequestData: Omit<LeaveRequest, '_id' | 'status' | 'rejectionReason'>) => {
    setIsLeaveSubmitting(true);
    try {
      await api.post(`/employees/${user.id}/leaves`, newLeaveRequestData);
      fetchData();
      toast.success("Leave request submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit leave request.");
      console.error("Leave submission error:", error);
    } finally {
      setIsLeaveSubmitting(false); // ✅ Set loading false
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!employee) return;
    try {
      const updatedNotifications = employee.notifications.map(n =>
        n._id === notificationId ? { ...n, status: 'read' as 'read' } : n
      );
      setEmployee({ ...employee, notifications: updatedNotifications });

      const stillHasUnread = updatedNotifications.some(n => n.status === 'unread');
      setHasUnread(stillHasUnread);

      await api.put(`/employees/${user.id}/notifications/${notificationId}`);
      toast.info("Notification marked as read.");
    } catch (error) {
      toast.error("Failed to mark notification as read.");
      fetchData();
    }
  };

  const handleCreateEvent = async (eventData: { title: string; description: string; date: string; time: string }) => {
  setIsSubmittingEvent(true); // ✅ Set loading
  try {
    await api.post('/events', { ...eventData, employee: user.id });
    toast.success("Event created successfully!");
    fetchData(); // Refresh all data
  } catch (error) {
    toast.error("Failed to create event.");
    throw error; // ✅ Re-throw error so modal stays open
  } finally {
    setIsSubmittingEvent(false); // ✅ Unset loading
  }
};

  if (!employee) {
    return <div className="p-8">Loading...</div>;
  }

  const openSlipModal = (slipPath: string) => {
    setSelectedSlipPath(slipPath);
    setIsSlipModalOpen(true);
  };

  const handleMarkEventAsComplete = async (eventId: string) => {
    try {
      // Optimistically update the UI
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event._id === eventId ? { ...event, status: 'completed' } : event
        )
      );
      await api.put(`/events/${eventId}/status`);
      toast.success("Event marked as complete!");
    } catch (error) {
      toast.error("Failed to update event.");
      // Re-fetch data to revert optimistic update on error
      fetchData();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Optimistically update the UI
      setEvents(prevEvents => prevEvents.filter(event => event._id !== eventId));
      await api.delete(`/events/${eventId}`);
      toast.success("Event deleted!");
    } catch (error) {
      toast.error("Failed to delete event.");
      // Re-fetch data to revert optimistic update on error
      fetchData();
    }
  };

  const handleMarkTaskAsComplete = async (taskId: string) => {
    setIsCompletingTask(true);
    try { 
      await api.put(`/tasks/${taskId}/status`); 
      toast.success("Task marked as complete!");
      setIsViewTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error) { 
      toast.error("Failed to update task status."); 
      fetchData();
    } finally {
      setIsCompletingTask(false);
    }
  };
  
  const openViewTaskModal = (task: Task) => {
    setSelectedTask(task);
    setIsViewTaskModalOpen(true);
  };

  // --- PAGINATION DATA SLICING ---
  
  const totalMyAttendancePages = Math.ceil((employee?.attendance.length || 0) / RECORDS_PER_PAGE);
  const paginatedMyAttendance = employee?.attendance.slice(
      (pagination.myAttendance - 1) * RECORDS_PER_PAGE,
      pagination.myAttendance * RECORDS_PER_PAGE
  ) || [];

  const totalMyLeavePages = Math.ceil((employee?.leaveRequests.length || 0) / RECORDS_PER_PAGE);
  const paginatedMyLeaves = employee?.leaveRequests.slice(
      (pagination.myLeaveRequests - 1) * RECORDS_PER_PAGE,
      pagination.myLeaveRequests * RECORDS_PER_PAGE
  ) || [];

  const totalMySalaryPages = Math.ceil(filteredSalaryHistory.length / RECORDS_PER_PAGE);
  const paginatedMySalary = filteredSalaryHistory.slice(
      (pagination.mySalary - 1) * RECORDS_PER_PAGE,
      pagination.mySalary * RECORDS_PER_PAGE
  );

  const totalMyNotificationPages = Math.ceil(filteredNotifications.length / RECORDS_PER_PAGE);
  const paginatedMyNotifications = filteredNotifications.slice(
      (pagination.myNotifications - 1) * RECORDS_PER_PAGE,
      pagination.myNotifications * RECORDS_PER_PAGE
  );


  const employeeTabs = [
    { name: "Home", icon: Home, value: "home" },
    { name: "Attendance", icon: Calendar, value: "attendance" },
    { name: "Leave Requests", icon: FileText, value: "leave-requests" },
    { name: "Salary History", icon: DollarSign, value: "salary-history" },
    { name: "Notifications", icon: Bell, value: "notifications" }
  ];

   const monthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <div className="flex h-screen bg-blue-50">
      <SalarySlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        slipPath={selectedSlipPath}
      />

      <AddEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} onSubmit={handleCreateEvent} isSubmitting={isSubmittingEvent} />

      <MSidebar
        tabs={employeeTabs}
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <ViewTaskModal
        isOpen={isViewTaskModalOpen}
        onClose={() => setIsViewTaskModalOpen(false)}
        onComplete={handleMarkTaskAsComplete}
        task={selectedTask}
        isCompleting={isCompletingTask}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full">
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-indigo-400">Welcome, {employee.name}!</h1>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => setActiveTab('notifications')}>
                <Bell size={28} />
                {hasUnread && <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-indigo-400" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full"><LogOut /></Button>
            </div>
          </div>

          {/* --- NEW LAYOUT FOR HOME TAB --- */}
          <TabsContent value="home" className="mt-4 space-y-6">

            {/* 1. MARK ATTENDANCE SECTION */}
            <Card className="bg-gradient-to-r from-indigo-400 to-purple-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6" /> Mark Your Attendance</CardTitle>
                <CardDescription className="text-white">
                  {currentTime.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="text-6xl font-bold font-mono tracking-wider">{currentTime.toLocaleTimeString('en-US')}</div>
                {punchStatus === 'punched-out' && !hasMissedPunchIn && (
                  <Button size="lg" className="w-48 bg-green-300 text-white hover:bg-slate-200" onClick={handlePunchIn} disabled={!isPunchInWindow}>Punch In</Button>
                )}
                {hasMissedPunchIn && (
                  <div className="text-center">
                    <p className="text-white font-semibold text-lg">You are Absent</p>
                    <p className="text-sm text-white">The punch-in window (9 AM - 11 AM) has closed.</p>
                  </div>
                )}
                {punchStatus === "absent" && (
                  <div className="text-center">
                    <p className="text-white font-semibold text-lg">You have been marked Absent</p>
                    <p className="text-sm text-white">You did not punch in before 11 AM.</p>
                  </div>
                )}
                {punchStatus === 'punched-in' && (
                  <Button size="lg" variant="destructive" className="w-48" onClick={handlePunchOut}>Punch Out</Button>
                )}
                {punchStatus === 'completed' && (
                  <p className="text-gray-200 font-semibold">Your attendance for today has been completed.</p>
                )}
              </CardContent>
            </Card>

            {/* 2. CALENDAR AND EVENTS SECTION */}
            <Card>
              <CardContent className="grid md:grid-cols-2 gap-4 p-4">
                 <div className="rounded-md border p-4 flex items-center justify-center"><CalendarComponent showSelectedDateInfo={false} className="shadow-none p-0 border-0" />
                 </div>
                <div className="flex flex-col space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-2xl">My Events</h3>
                    <Button size="default" onClick={() => setIsEventModalOpen(true)}>+ Add Event</Button>
                  </div>

                  {/* Today's Events Section */}
                  <div>
                    <h4 className="font-semibold text-md mb-2 text-gray-800">Todays</h4>
                    <div className="overflow-y-auto max-h-40 pr-3"> {/* Scroll Container */}
                      {todaysEvents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {todaysEvents.map((event) => (
                            <div
                              key={event._id}
                              className={`p-3 rounded-lg shadow-sm border flex flex-col h-24 transition-all ${event.status === 'completed'
                                ? 'bg-green-100 border-green-300'
                                : 'bg-blue-100 border-blue-200'
                                }`}
                            >
                              <div className="flex justify-between items-start flex-grow">
                                <p className={`font-bold text-sm break-words ${event.status === 'completed' ? 'text-green-800 line-through' : 'text-blue-800'
                                  }`}>{event.title}</p>
                                <div className="flex items-center space-x-0.5 ml-1 flex-shrink-0">
                                  {event.status !== 'completed' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-green-600 hover:bg-green-200 hover:text-green-700"
                                      onClick={() => handleMarkEventAsComplete(event._id)}
                                    ><Check size={14} /></Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-600 hover:bg-red-200 hover:text-red-700"
                                    onClick={() => handleDeleteEvent(event._id)}
                                  ><X size={14} /></Button>
                                </div>
                              </div>
                              <p className={`text-xs self-end ${event.status === 'completed' ? 'text-green-600' : 'text-blue-700'
                                }`}>{formatTime(event.time)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No events for today.</p>
                      )}
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Upcoming Events Section */}
                  <div>
                    <h4 className="font-semibold text-md mb-2 text-gray-800">Upcoming</h4>
                    <div className="overflow-y-auto max-h-40 pr-3"> {/* Scroll Container */}
                      {upcomingEvents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {upcomingEvents.map((event) => (
                            <div
                              key={event._id}
                              className={`p-3 rounded-lg shadow-sm border flex flex-col h-24 transition-all ${event.status === 'completed'
                                ? 'bg-green-100 border-green-300'
                                : 'bg-yellow-100 border-yellow-200'
                                }`}
                            >
                              <div className="flex justify-between items-start flex-grow">
                                <p className={`font-bold text-sm break-words ${event.status === 'completed' ? 'text-green-800 line-through' : 'text-yellow-800'
                                  }`}>{event.title}</p>
                                <div className="flex items-center space-x-0.5 ml-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-600 hover:bg-red-200 hover:text-red-700"
                                    onClick={() => handleDeleteEvent(event._id)}
                                  ><X size={14} /></Button>
                                </div>
                              </div>
                              <p className={`text-xs self-end ${event.status === 'completed' ? 'text-green-600' : 'text-yellow-700'
                                }`}>{formatDate(event.date)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No upcoming events.</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                  <CardTitle>My Assigned Tasks</CardTitle>
                  <CardDescription>Tasks assigned to you by management.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-y-auto max-h-64 pr-3">
                    {sortedPersonalTasks.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sortedPersonalTasks.map(task => (
                          <Button
                            key={task._id}
                            variant="outline"
                            className={`h-auto p-3 rounded-lg shadow-sm flex flex-col items-start justify-start text-left ${
                              task.status === 'Completed' ? 'bg-green-50 border-green-200' : 'bg-white'
                            }`}
                            onClick={() => openViewTaskModal(task)}
                          >
                            <div className="flex justify-between w-full items-start">
                              <p className={`font-bold text-sm ${task.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-primary'}`}>{task.title}</p>
                              <Badge variant={task.status === 'Completed' ? 'default' : 'outline'}>{task.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">From: {task.createdBy.name}</p>
                            <p className="text-xs text-muted-foreground mt-2 self-end">{formatDate(task.date)}</p>
                          </Button>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">You have no assigned tasks.</p>}
                  </div>
                </CardContent>
              </Card>

            {/* 3. ATTENDANCE CARDS SECTION */}
            <div className="space-y-4">

              <h3 className="text-4xl font-semibold text-indigo-400">
                   {monthName} stats
              </h3>

              {/* First Row */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-100 border-blue-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-lg font-medium">Total Days</CardTitle><CalendarDays className="h-10 w-14 text-muted-foreground" /></CardHeader><CardContent><div className="text-7xl font-regular">{attendanceStats.totalDaysInMonth}</div></CardContent></Card>
                <Card className="bg-green-100 border-green-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-lg font-medium">Present</CardTitle><CheckCircle className="h-10 w-14 text-muted-foreground" /></CardHeader><CardContent><div className="text-7xl font-regular">{attendanceStats.presentDays}</div></CardContent></Card>
                <Card className="bg-red-100 border-red-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-lg font-medium">Absent</CardTitle><XCircle className="h-10 w-14 text-muted-foreground" /></CardHeader><CardContent><div className="text-7xl font-regular">{attendanceStats.absentDays}</div></CardContent></Card>
              </div>
              {/* Second Row */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-yellow-100 border-yellow-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-lg font-medium">Sick Leave</CardTitle><Bed className="h-10 w-14 text-muted-foreground" /></CardHeader><CardContent><div className="text-7xl font-regular">{attendanceStats.sickLeaveDays}</div></CardContent></Card>
                <Card className="bg-indigo-100 border-indigo-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-lg font-medium">Paid Leave</CardTitle><Plane className="h-10 w-14 text-muted-foreground" /></CardHeader><CardContent><div className="text-7xl font-regular">{attendanceStats.paidLeaveDays}</div></CardContent></Card>
                <Card className="bg-purple-100 border-purple-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-lg font-medium">Half Day</CardTitle><Slice className="h-10 w-14 text-muted-foreground" /></CardHeader><CardContent><div className="text-7xl font-regular">{attendanceStats.halfDayLeaves}</div></CardContent></Card>
                <Card className="bg-pink-100 border-pink-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-lg font-medium">Short Leave</CardTitle><Briefcase className="h-10 w-14 text-muted-foreground" /></CardHeader><CardContent><div className="text-7xl font-regular">{attendanceStats.shortLeaveDays}</div></CardContent></Card>
              </div>
            </div>

            {/* 4. LEAVE APPLICATIONS SECTION */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Leave Requests Summary</CardTitle></CardHeader>
                <CardContent>
                  {latestLeave ? ( // Simplified to show last leave, as breakdown is above
                    <ul className="space-y-2">
                      {Object.entries(
                        employee.leaveRequests.reduce((acc, leave) => {
                          acc[leave.type] = (acc[leave.type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <li key={type} className="flex justify-between">
                          <span>{type}</span>
                          <Badge>{count}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">No leave requests found.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Last Leave Application</CardTitle></CardHeader>
                <CardContent>
                  {latestLeave ? (
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="font-semibold">Type:</span><span>{latestLeave.type}</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Start Date:</span><span>{formatDate(latestLeave.startDate)}</span></div>
                      <div className="flex justify-between"><span className="font-semibold">End Date:</span><span>{formatDate(latestLeave.endDate)}</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Status:</span><Badge>{latestLeave.status}</Badge></div>
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No leave applications found.</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-4 space-y-6">
            <Card >
              <CardHeader><CardTitle>My Attendance</CardTitle></CardHeader>
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
                    {paginatedMyAttendance.map((att, index) => (
                      <TableRow key={att.date}>
                        <TableCell>{((pagination.myAttendance - 1) * RECORDS_PER_PAGE) + index + 1}</TableCell>
                        <TableCell>{formatDate(att.date)}</TableCell>
                        <TableCell>{formatTime(att.checkIn)}</TableCell>
                        <TableCell>{formatTime(att.checkOut)}</TableCell>
                        <TableCell><Badge variant={
                          att.status === "Present" ? "default" :
                            att.status === "Absent" ? "destructive" : "default"
                        } className="whitespace-nowrap" >{att.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls currentPage={pagination.myAttendance} totalPages={totalMyAttendancePages} onPageChange={(page) => handlePageChange('myAttendance', page)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave-requests" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Leave Requests</CardTitle>
                <ApplyLeaveModal onSubmit={handleLeaveSubmit} isSubmitting={isLeaveSubmitting}>
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
                    {paginatedMyLeaves.map((req, index) => (
                      <TableRow key={req._id}>
                        <TableCell>{((pagination.myLeaveRequests - 1) * RECORDS_PER_PAGE) + index + 1}</TableCell>
                        <TableCell>{req.type}</TableCell>
                        <TableCell>{formatDate(req.startDate)}</TableCell>
                        <TableCell>{formatDate(req.endDate)}</TableCell>
                        <TableCell><Badge variant={req.status == "Approved" || req.status == "Pending" ? "default" : "destructive"}>{req.status}</Badge></TableCell>
                        <TableCell>
                          {req.status === 'Rejected' && req.rejectionReason && (
                            <ViewCommentModal reason={req.rejectionReason}>
                              <Button variant="outline" size="sm">View Comment</Button>
                            </ViewCommentModal>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls currentPage={pagination.myLeaveRequests} totalPages={totalMyLeavePages} onPageChange={(page) => handlePageChange('myLeaveRequests', page)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary-history" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Salary History</CardTitle>
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
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Punched</TableHead>
                      <TableHead>View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMySalary.length > 0 ? (
                      paginatedMySalary.map((sal, index) => (
                        <TableRow key={sal._id}>
                          <TableCell>{((pagination.mySalary - 1) * RECORDS_PER_PAGE) + index + 1}</TableCell>
                          <TableCell>{sal.month}</TableCell>
                          <TableCell>₹{sal.amount.toLocaleString()}</TableCell>
                          <TableCell><Badge>{sal.status}</Badge></TableCell>
                          <TableCell>{formatDate(sal.date)}</TableCell>
                          <TableCell>
                            {sal.slipPath && (
                              <Button variant="outline" size="sm" onClick={() => openSlipModal(sal.slipPath!)}>
                                View Slip
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No Salary history record
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <PaginationControls currentPage={pagination.mySalary} totalPages={totalMySalaryPages} onPageChange={(page) => handlePageChange('mySalary', page)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
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
                <div className="space-y-4 ">
                  {paginatedMyNotifications.length > 0 ? (
                    paginatedMyNotifications.map(notification => (
                      <div key={notification._id} className="flex items-start justify-between p-4 rounded-lg border bg-indigo-50 border-indigo-200">
                        <div className="flex items-start space-x-4 ">
                          <span className={`mt-1.5 h-2 w-2 rounded-full ${notification.status === 'unread' ? 'bg-blue-500' : 'bg-indigo-200'}`} />
                          <div className="flex flex-col">
                            <p className={`text-sm ${notification.status === 'unread' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.date)}</p>
                            {notification.sentBy && (
                              <p className="text-xs font-semibold text-muted-foreground mt-1">
                                - {notification.sentBy.name} ({notification.sentBy.role})
                              </p>
                            )}
                          </div>
                        </div>
                        {notification.status === 'unread' && (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification._id)}>
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    ))
                  ) : <p className="text-sm text-muted-foreground text-center">You have no new notifications for this period.</p>}
                </div>
                <PaginationControls currentPage={pagination.myNotifications} totalPages={totalMyNotificationPages} onPageChange={(page) => handlePageChange('myNotifications', page)} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
