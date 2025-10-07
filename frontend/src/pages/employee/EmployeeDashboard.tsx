import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { PunchStatus, Employee, LeaveRequest, AppNotification } from "@/types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApplyLeaveModal } from "@/components/shared/ApplyLeaveModal";
import { Bell, LogOut, Clock } from "lucide-react";
import { ViewCommentModal } from "@/components/shared/ViewCommentModal";
import api from '@/api';
import { SalarySlipModal } from "../../components/shared/SalarySlipModal";
import { Sidebar } from "@/components/shared/SideBar";

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

  const [activeTab, setActiveTab] = useState("attendance");
  const [hasUnread, setHasUnread] = useState(false);

  const currentHour = currentTime.getHours();
  const isPunchInWindow = currentHour >= 9 && currentHour < 11;
  const hasMissedPunchIn = currentHour >= 11 && punchStatus === 'punched-out';

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [attendanceRes, salaryRes, leavesRes, notificationsRes] = await Promise.all([
        api.get(`/employees/${user.id}/attendance`),
        api.get(`/employees/${user.id}/salaries`),
        api.get(`/employees/${user.id}/leaves`),
        api.get(`/employees/${user.id}/notifications`)
      ]);

      const unread = notificationsRes.data.some((n: any) => n.status === 'unread');
      setHasUnread(unread);
      
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
    if (!user?.id) {
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

  if (!employee) {
    return <div className="p-8">Loading...</div>;
  }

  const openSlipModal = (slipPath: string) => {
    setSelectedSlipPath(slipPath);
    setIsSlipModalOpen(true);
  };

  const employeeTabs = [
    "Attendance",
    "Leave Requests",
    "Salary History",
    "Notifications",
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <SalarySlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        slipPath={selectedSlipPath}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full">
        <Sidebar tabs={employeeTabs} user={user} className="w-1/5 border-r" />
        
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Welcome, {employee.name}!</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative"
                onClick={() => setActiveTab('notifications')}
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
                    <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6" /> Mark Attendance</CardTitle>
                    <CardDescription>
                        {currentTime.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    <div className="text-6xl font-bold font-mono">{currentTime.toLocaleTimeString('en-US')}</div>
                    {punchStatus === 'punched-out' && !hasMissedPunchIn && (
                        <Button size="lg" className="w-48" onClick={handlePunchIn} disabled={!isPunchInWindow}>Punch In</Button>
                    )}
                    {hasMissedPunchIn && (
                        <div className="text-center">
                            <p className="text-red-600 font-semibold text-lg">You are Absent</p>
                            <p className="text-sm text-muted-foreground">The punch-in window (9 AM - 11 AM) has closed.</p>
                        </div>
                    )}
                    {punchStatus === "absent" && (
                        <div className="text-center">
                            <p className="text-red-600 font-semibold text-lg">You have been marked Absent</p>
                            <p className="text-sm text-muted-foreground">You did not punch in before 11 AM.</p>
                        </div>
                    )}
                    {punchStatus === 'punched-in' && (
                        <Button 
                          size="lg" 
                          variant="destructive" 
                          className="w-48" 
                          onClick={handlePunchOut}
                          disabled={employee.attendance.find(att => att.date === new Date().toISOString().slice(0, 10))?.checkIn === '--'}
                        >
                          Punch Out
                        </Button>
                    )}
                    {punchStatus === 'completed' && (
                        <p className="text-green-600 font-semibold">Your attendance for today has been completed.</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>My Attendance</CardTitle></CardHeader>
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
                            {employee.attendance.map((att) => (
                                <TableRow key={att.date}>
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
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employee.leaveRequests.map((req) => (
                      <TableRow key={req._id}>
                        <TableCell>{req.type}</TableCell>
                        <TableCell>{formatDate(req.startDate)}</TableCell>
                        <TableCell>{formatDate(req.endDate)}</TableCell>
                        <TableCell><Badge variant={req.status == "Approved" || req.status == "Pending" ? "default":"destructive"}>{req.status}</Badge></TableCell>
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
                  <Button variant="outline" size="sm" onClick={() => { setFilterMonth(''); setFilterYear(''); }}>Clear</Button>
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
                    {filteredSalaryHistory.map((sal) => (
                      <TableRow key={sal._id}>
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
                    <Button size="sm" variant={notificationFilter === 'all' ? 'default' : 'outline'} onClick={() => setNotificationFilter('all')}>All</Button>
                    <Button size="sm" variant={notificationFilter === 'today' ? 'default' : 'outline'} onClick={() => setNotificationFilter('today')}>Today</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notification => (
                      <div key={notification._id} className="flex items-start justify-between p-4 rounded-lg border">
                        <div className="flex items-start space-x-4">
                          <span className={`mt-1.5 h-2 w-2 rounded-full ${notification.status === 'unread' ? 'bg-blue-500' : 'bg-gray-300'}`} />
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
