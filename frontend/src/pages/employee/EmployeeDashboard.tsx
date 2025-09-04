import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PunchStatus, Employee, LeaveRequest, AppNotification } from "@/types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApplyLeaveModal } from "@/components/shared/ApplyLeaveModal";
import { Bell, UserCircle2, LogOut, Clock  } from "lucide-react";
import { ViewCommentModal } from "@/components/shared/ViewCommentModal";
import api from '@/api';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


// Helper to format date from YYYY-MM-DD to DD/MM/YYYY
const formatDate = (dateString?: string) => {
  if (!dateString || dateString === '--') return 'N/A';
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

export function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [filteredNotifications, setFilteredNotifications] = useState<AppNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'today'>('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchStatus, setPunchStatus] = useState<PunchStatus>('punched-out');
  const navigate = useNavigate();

  // The user object from localStorage contains 'id' which is an alias for '_id' from the backend
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Effect for the live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    const fetchEmployeeData = async () => {
      try {
        // Fetch all related data for the employee dashboard
        const [attendanceRes, salaryRes, leavesRes, notificationsRes] = await Promise.all([
          api.get(`/employees/${user.id}/attendance`),
          api.get(`/employees/${user.id}/salaries`),
          api.get(`/employees/${user.id}/leaves`),
          api.get(`/employees/${user.id}/notifications`)
        ]);

        // Check for unread notifications after fetching data
        const unreadNotifications = notificationsRes.data.some((n: any) => n.status === 'unread');
        const hasShownLoginToast = sessionStorage.getItem('loginNotificationShown');

        if (unreadNotifications && !hasShownLoginToast) {
          toast.info("You have new messages. Please check your notifications!");
          // Set a flag in session storage to prevent the toast from showing again during this session
          sessionStorage.setItem('loginNotificationShown', 'true');
        }

        // Check initial punch status
        const today = new Date().toISOString().slice(0, 10);
        const todaysAttendance = attendanceRes.data.find((att: any) => att.date === today);
        if (todaysAttendance) {
          if (todaysAttendance.checkOut) {
            setPunchStatus('completed');
          } else {
            setPunchStatus('punched-in');
          }
        } else {
          setPunchStatus('punched-out');
        }

        // Construct the full employee object for the state
        setEmployee({
          _id: user.id, // Use the ID from the logged-in user session
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          attendance: attendanceRes.data,
          salaryHistory: salaryRes.data,
          leaveRequests: leavesRes.data,
          notifications: notificationsRes.data,
        });
      } catch (error) {
        toast.error('Failed to fetch employee data.');
        console.error(error);
      }
    };

    fetchEmployeeData();
  }, [user.id, navigate]);

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

  const handlePunchIn = async () => {
    try {
      const response = await api.post(`/employees/${user.id}/punch-in`);
      setEmployee(prev => prev ? { ...prev, attendance: response.data } : null);
      setPunchStatus('punched-in');
      toast.success("Punched in successfully!");
    } catch (error) {
      toast.error("Failed to punch in.");
    }
  };
  
  const handlePunchOut = async () => {
    try {
      const response = await api.post(`/employees/${user.id}/punch-out`);
      setEmployee(prev => prev ? { ...prev, attendance: response.data } : null);
      setPunchStatus('completed');
      toast.info("Punched out successfully!");
    } catch (error) {
      toast.error("Failed to punch out.");
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('user');
    // Clear the session storage flag on logout
    sessionStorage.removeItem('loginNotificationShown');
    toast.success("You have been logged out.");
    navigate('/login');
  };

  // The modal will provide a LeaveRequest object without the `_id` or `status`
  const handleLeaveSubmit = async (newLeaveRequestData: Omit<LeaveRequest, '_id' | 'status'>) => {
    try {
      await api.post(`/employees/${user.id}/leaves`, newLeaveRequestData);
      // Refetch leave requests to update the list
      const response = await api.get(`/employees/${user.id}/leaves`);
      setEmployee(prev => prev ? { ...prev, leaveRequests: response.data } : null);
      toast.success("Leave request submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit leave request.");
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.put(`/employees/${user.id}/notifications/${notificationId}`);
      setEmployee(prev => prev ? {
        ...prev,
        // Update the status of the correct notification using `_id`
        notifications: prev.notifications.map(n => n._id === notificationId ? { ...n, status: 'read' } : n)
      } : null);
      toast.info("Notification marked as read.");
    } catch (error) {
      toast.error("Failed to mark notification as read.");
    }
  };

  if (!employee) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Welcome, {employee.name}!</h1>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle2 className="h-16 w-16" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="grid gap-2 text-sm p-2">
                <div className="font-bold">{user.name}</div>
                <div className="text-muted-foreground">{user.email}</div>
                <div className="mt-2">
                  <Badge>{user.role}</Badge>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
            <LogOut className="h-16 w-16" />
          </Button>
        </div>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6" /> Mark Attendance</CardTitle>
          <CardDescription>
            {currentTime.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="text-6xl font-bold font-mono">
            {currentTime.toLocaleTimeString('en-US')}
          </div>
          {punchStatus === 'punched-out' && (
            <Button size="lg" className="w-48" onClick={handlePunchIn}>Punch In</Button>
          )}
          {punchStatus === 'punched-in' && (
            <Button size="lg" variant="destructive" className="w-48" onClick={handlePunchOut}>Punch Out</Button>
          )}
           {punchStatus === 'completed' && (
            <p className="text-green-600 font-semibold">Attendance for today has been completed.</p>
          )}
        </CardContent>
      </Card>


      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">My Attendance</TabsTrigger>
          <TabsTrigger value="salary">Salary History</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
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
                      <TableCell><Badge variant={att.status === 'Present' ? 'default' : 'destructive'}>{att.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <Card>
            <CardHeader><CardTitle>My Salary History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Punched</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.salaryHistory.map((sal) => (
                    <TableRow key={sal.month}>
                      <TableCell>{sal.month}</TableCell>
                      <TableCell>₹{sal.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge>{sal.status}</Badge></TableCell>
                      <TableCell>{formatDate(sal.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="mt-4">
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
                      <TableCell><Badge>{req.status}</Badge></TableCell>
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

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" /> My Notifications
                </CardTitle>
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center">You have no new notifications for this period.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
