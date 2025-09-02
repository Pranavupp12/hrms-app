import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Employee, LeaveRequest } from "@/types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApplyLeaveModal } from "@/components/shared/ApplyLeaveModal";
import { Bell } from "lucide-react";
import { ViewCommentModal } from "@/components/shared/ViewCommentModal";
import api from '@/api';

export function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const navigate = useNavigate();

  // The user object from localStorage contains 'id' which is an alias for '_id' from the backend
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

  const handleLogout = () => {
    localStorage.removeItem('user');
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
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>

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
                      <TableCell>{att.date}</TableCell>
                      <TableCell>{att.checkIn}</TableCell>
                      <TableCell>{att.checkOut}</TableCell>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.salaryHistory.map((sal) => (
                    <TableRow key={sal.month}>
                      <TableCell>{sal.month}</TableCell>
                      <TableCell>₹{sal.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={sal.status === 'Paid' ? 'secondary' : 'outline'}>{sal.status}</Badge></TableCell>
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
                      <TableCell>{req.startDate}</TableCell>
                      <TableCell>{req.endDate}</TableCell>
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
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" /> My Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employee.notifications.length > 0 ? (
                  employee.notifications.map(notification => (
                    <div key={notification._id} className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex items-start space-x-4">
                        <span className={`mt-1.5 h-2 w-2 rounded-full ${notification.status === 'unread' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <div className="flex flex-col">
                          <p className={`text-sm ${notification.status === 'unread' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.date}</p>
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
                  <p className="text-sm text-muted-foreground text-center">You have no new notifications.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
