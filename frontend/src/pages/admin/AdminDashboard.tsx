import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AddEmployeeModal } from "../../components/shared/AddEmployeeModal";
import { RejectLeaveModal } from "../../components/shared/RejectLeaveModal";
import type { Employee, Salary, SentNotification, LeaveRequest } from "@/types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from '../../api';

export function AdminDashboard() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<(LeaveRequest & { employeeName: string; id: string; })[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<(Salary & { employeeName: string; id: string })[]>([]);
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);

  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationRecipient, setNotificationRecipient] = useState("all");
  const [salaryEmployeeId, setSalaryEmployeeId] = useState('');
  const [salaryAmount, setSalaryAmount] = useState<number | ''>('');
  const [salaryMonth, setSalaryMonth] = useState('');

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [employeesRes, leavesRes, salariesRes, notificationsRes] = await Promise.all([
        api.get('/admin/employees'),
        api.get('/admin/leave-requests'),
        api.get('/admin/salaries'),
        api.get('/admin/notifications')
      ]);
      setAllEmployees(employeesRes.data);
      setLeaveRequests(leavesRes.data);
      setSalaryHistory(salariesRes.data);
      setSentNotifications(notificationsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data.');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveLeave = async (leaveId: string) => {
    try {
      await api.put(`/admin/leave-requests/${leaveId}/approve`);
      fetchData();
      toast.success(`Leave request has been approved.`);
    } catch (error) {
      toast.error('Failed to approve leave request.');
    }
  };

  const handleRejectLeave = async (leaveId: string, reason: string) => {
    try {
      await api.put(`/admin/leave-requests/${leaveId}/reject`, { rejectionReason: reason });
      fetchData();
      toast.error(`Leave request has been rejected.`);
    } catch (error) {
      toast.error('Failed to reject leave request.');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await api.delete(`/admin/employees/${employeeId}`);
      fetchData();
      toast.info(`Employee has been deleted.`);
    } catch (error) {
      toast.error('Failed to delete employee.');
    }
  };

  const handleAddNewEmployee = async (newEmployeeData: { name: string; email: string; password: string }) => {
    try {
      await api.post('/admin/employees', newEmployeeData);
      fetchData();
      toast.success('New employee added.');
    } catch (error) {
      toast.error('Failed to add employee.');
    }
  };

  const handleSendNotification = async () => {
    if (!notificationMessage.trim()) {
      toast.error("Notification message cannot be empty.");
      return;
    }

    try {
      await api.post('/admin/notifications', {
        recipient: notificationRecipient,
        message: notificationMessage
      });
      fetchData();
      toast.success(`Notification sent.`);
      setNotificationMessage("");
      setNotificationRecipient("all");
    } catch (error) {
      toast.error('Failed to send notification.');
    }
  };

  const handleSalaryPunchIn = async () => {
    if (!salaryEmployeeId || !salaryAmount || !salaryMonth.trim()) {
      toast.error("Please fill out all salary fields.");
      return;
    }

    try {
      await api.post('/admin/salary', {
        employeeId: salaryEmployeeId,
        amount: salaryAmount,
        month: salaryMonth
      });
      fetchData();
      toast.success(`Salary punched in.`);
      setSalaryEmployeeId('');
      setSalaryAmount('');
      setSalaryMonth('');
    } catch (error) {
      toast.error('Failed to punch in salary.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success("You have been logged out.");
    navigate('/login');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>

      <Tabs defaultValue="leave-requests">
        <TabsList>
          <TabsTrigger value="leave-requests">Leave Requests</TabsTrigger>
          <TabsTrigger value="employees">Employee Management</TabsTrigger>
          <TabsTrigger value="notifications">Send Notification</TabsTrigger>
          <TabsTrigger value="salary-punch">Salary Punch In</TabsTrigger>
        </TabsList>

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
                      <TableCell>{req.startDate} to {req.endDate}</TableCell>
                      <TableCell className="max-w-xs truncate">{req.reason || 'N/A'}</TableCell>
                      <TableCell><Badge>{req.status}</Badge></TableCell>
                      <TableCell className="space-x-2">
                        {req.status === 'Pending' && (
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

        <TabsContent value="employees" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Employees</CardTitle>
              <AddEmployeeModal onSubmit={handleAddNewEmployee}>
                <Button>Add Employee</Button>
              </AddEmployeeModal>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEmployees.map((emp) => (
                    <TableRow key={emp._id}>
                      <TableCell>{emp._id}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteEmployee(emp._id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Send a New Notification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <select
                  id="recipient"
                  className="w-full p-2 border rounded mt-1 bg-background"
                  value={notificationRecipient}
                  onChange={(e) => setNotificationRecipient(e.target.value)}
                >
                  <option value="all">All Employees</option>
                  {allEmployees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your notification here..."
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                />
              </div>
              <Button onClick={handleSendNotification}>Send Notification</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sent Notifications History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Recipient</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentNotifications.map(notif => (
                    <TableRow key={notif._id}>
                      <TableCell className="whitespace-nowrap">{notif.date}</TableCell>
                      <TableCell className="max-w-md truncate">{notif.message}</TableCell>
                      <TableCell>{notif.recipient}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary-punch" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Punch In Employee Salary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="salary-employee">Select Employee</Label>
                <select
                  id="salary-employee"
                  className="w-full p-2 border rounded mt-1 bg-background"
                  value={salaryEmployeeId}
                  onChange={(e) => setSalaryEmployeeId(e.target.value)}
                >
                  <option value="" disabled>Select an employee...</option>
                  {allEmployees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="salary-amount">Salary Amount (₹)</Label>
                <Input
                  id="salary-amount"
                  type="number"
                  placeholder="e.g., 50000"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="salary-month">Salary Period (e.g., August 2025)</Label>
                <Input
                  id="salary-month"
                  type="text"
                  placeholder="Enter month and year..."
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)}
                />
              </div>
              <Button onClick={handleSalaryPunchIn}>Punch In Salary</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Salary Punch-In History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Salary Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Punched</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryHistory.map((sal) => (
                    <TableRow key={sal.id}>
                      <TableCell>{sal.employeeName}</TableCell>
                      <TableCell>{sal.month}</TableCell>
                      <TableCell>₹{sal.amount.toLocaleString()}</TableCell>
                      <TableCell>{sal.date || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


