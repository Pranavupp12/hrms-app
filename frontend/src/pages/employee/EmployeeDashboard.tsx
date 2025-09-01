import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockEmployee } from "@/data/mock";
import type { LeaveRequest } from "@/types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApplyLeaveModal } from "@/components/shared/ApplyLeaveModal";
import { Bell } from "lucide-react";
import { ViewCommentModal } from "@/components/shared/ViewCommentModal"; 

export function EmployeeDashboard() {
  const [employee, setEmployee] = useState(mockEmployee);
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.success("You have been logged out.");
    navigate('/login');
  };

  const handleLeaveSubmit = (newLeaveRequestData: Omit<LeaveRequest, 'id' | 'status'>) => {
    const newLeaveRequest: LeaveRequest = {
      ...newLeaveRequestData,
      id: `leave-${crypto.randomUUID()}`,
      status: "Pending",
    };
    setEmployee(prev => ({
      ...prev,
      leaveRequests: [...prev.leaveRequests, newLeaveRequest]
    }));
  };

  // Function to mark a notification as read
  const handleMarkAsRead = (notificationId: string) => {
    setEmployee(prev => ({
      ...prev,
      notifications: prev.notifications.map(notif =>
        notif.id === notificationId ? { ...notif, status: 'read' } : notif
      )
    }));
    toast.info("Notification marked as read.");
  };

  return (
    <div className="p-8 space-y-8">
      {/* Aligned Header using Flexbox */}
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

        {/* Attendance Tab */}
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

        {/* Salary Tab */}
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

        {/* Leave Requests Tab */}
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
                    <TableHead>Actions</TableHead> {/* 2. Add Actions column header */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.leaveRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.type}</TableCell>
                      <TableCell>{req.startDate}</TableCell>
                      <TableCell>{req.endDate}</TableCell>
                      <TableCell><Badge>{req.status}</Badge></TableCell>
                      <TableCell>
                        {/* 3. Conditionally render the button and modal */}
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

        {/* Notifications Tab */}
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
                    <div key={notification.id} className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex items-start space-x-4">
                        <span className={`mt-1.5 h-2 w-2 rounded-full ${notification.status === 'unread' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <div className="flex flex-col">
                          <p className={`text-sm ${notification.status === 'unread' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.date}</p>
                        </div>
                      </div>
                      {notification.status === 'unread' && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification.id)}>
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
