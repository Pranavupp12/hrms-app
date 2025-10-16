import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { PunchStatus, Employee, LeaveRequest, AppNotification, Event } from "@/types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApplyLeaveModal } from "@/components/shared/ApplyLeaveModal";
import { Bell, LogOut, Clock, Check, X } from "lucide-react";
import { ViewCommentModal } from "@/components/shared/ViewCommentModal";
import api from '@/api';
import { SalarySlipModal } from "../../components/shared/SalarySlipModal";
import { Sidebar } from "@/components/shared/SideBar";
import { Calendar, FileText, DollarSign, CalendarDays, CheckCircle, XCircle, Briefcase, Bed, Plane, Slice } from "lucide-react";
import CalendarComponent from "@/components/shared/AnimatedCalendar";
import { AddEventModal } from "@/components/shared/AddEventModal";


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

  const currentHour = currentTime.getHours();
  const isPunchInWindow = currentHour >= 9 && currentHour < 11;
  const hasMissedPunchIn = currentHour >= 11 && punchStatus === 'punched-out';



  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [attendanceRes, salaryRes, leavesRes, notificationsRes, eventsRes] = await Promise.all([
        api.get(`/employees/${user.id}/attendance`),
        api.get(`/employees/${user.id}/salaries`),
        api.get(`/employees/${user.id}/leaves`),
        api.get(`/employees/${user.id}/notifications`),
        api.get(`/events/${user.id}`)
      ]);

      setEvents(eventsRes.data);

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || user.role !== "Employee") {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user.id, navigate, fetchData]);

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

  const { todaysEvents, upcomingEvents } = useMemo(() => {
    const todayString = new Date().toISOString().slice(0, 10);

    const todays = events.filter(event => event.date.slice(0, 10) === todayString);
    const upcoming = events.filter(event => event.date.slice(0, 10) !== todayString);

    // Optional: Sort upcoming events by date
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { todaysEvents: todays, upcomingEvents: upcoming };
  }, [events]);

  const latestLeave = useMemo(() => {
    if (!employee || employee.leaveRequests.length === 0) return null;
    return employee.leaveRequests.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
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
    try {
      await api.post(`/employees/${user.id}/punch-in`);
      fetchData();
      toast.success("Punched in successfully!");
    } catch (error) {
      toast.error("Failed to punch in.");
    }
  };

  const handlePunchOut = async () => {
    try {
      await api.post(`/employees/${user.id}/punch-out`);
      fetchData();
      toast.info("Punched out successfully!");
    } catch (error) {
      toast.error("Failed to punch out.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('loginNotificationShown');
    toast.success("You have been logged out.");
    navigate('/login');
  };

  const handleLeaveSubmit = async (newLeaveRequestData: Omit<LeaveRequest, '_id' | 'status' | 'rejectionReason'>) => {
    try {
      await api.post(`/employees/${user.id}/leaves`, newLeaveRequestData);
      fetchData();
      toast.success("Leave request submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit leave request.");
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
    try {
      await api.post('/events', { ...eventData, employee: user.id });
      toast.success("Event created successfully!");
      fetchData(); // Refresh data to show the new event
    } catch (error) {
      toast.error("Failed to create event.");
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

  const employeeTabs = [
    { name: "Home", icon: Clock },
    { name: "Attendance", icon: Calendar },
    { name: "Leave Requests", icon: FileText },
    { name: "Salary History", icon: DollarSign },
    { name: "Notifications", icon: Bell }
  ];


  return (
    <div className="flex h-screen bg-blue-50">
      <SalarySlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        slipPath={selectedSlipPath}
      />

      <AddEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} onSubmit={handleCreateEvent} />


      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full">
        <Sidebar tabs={employeeTabs} user={user} className="w-1/5 border-r" />
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-indigo-400">Welcome, {employee.name}!</h1>
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
                <CardTitle className="flex items-center">Mark Your Attendance</CardTitle>
                <CardDescription className="text-white">
                  {currentTime.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="text-6xl font-bold font-mono tracking-wider">{currentTime.toLocaleTimeString('en-US')}</div>
                {punchStatus === 'punched-out' && !hasMissedPunchIn && (
                  <Button size="lg" className="w-48 bg-green text-white hover:bg-gray-100" onClick={handlePunchIn} disabled={!isPunchInWindow}>Punch In</Button>
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
                <CalendarComponent
                  showSelectedDateInfo={false}
                  className="shadow-md p-4"
                />
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">My Events</h3>
                    <Button size="default" onClick={() => setIsEventModalOpen(true)}>+ Add Event</Button>
                  </div>

                  {/* Today's Events Section */}
                  <div>
                    <h4 className="font-semibold text-md mb-2 text-gray-800">Today</h4>
                    <div className="overflow-y-auto max-h-50 pr-3"> {/* Scroll Container */}
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

                  {/* Upcoming Events Section */}
                  <div>
                    <h4 className="font-semibold text-md mb-2 text-gray-800">Upcoming</h4>
                    <div className="overflow-y-auto max-h-50 pr-3"> {/* Scroll Container */}
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

            {/* 3. ATTENDANCE CARDS SECTION */}
            <div className="space-y-4">
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
                    {employee.attendance.map((att, index) => (
                      <TableRow key={att.date}>
                        <TableCell>{index + 1}</TableCell>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave-requests" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Leave Requests</CardTitle>
                <ApplyLeaveModal onSubmit={handleLeaveSubmit}>
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
                    {employee.leaveRequests.map((req, index) => (
                      <TableRow key={req._id}>
                        <TableCell>{index + 1}</TableCell>
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
                    {filteredSalaryHistory.map((sal, index) => (
                      <TableRow key={sal._id}>
                        <TableCell>{index + 1}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
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
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notification => (
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
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
