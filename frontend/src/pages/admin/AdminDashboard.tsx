import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AddEmployeeModal } from "@/components/shared/AddEmployeeModal";
import { RejectLeaveModal } from "@/components/shared/RejectLeaveModal";
import { mockAllEmployees, mockSentNotifications } from "@/data/mock";
import type { Employee, Salary, SentNotification } from "@/types";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function AdminDashboard() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>(mockAllEmployees);
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>(mockSentNotifications);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationRecipient, setNotificationRecipient] = useState("all");

  const [salaryEmployeeId, setSalaryEmployeeId] = useState('');
  const [salaryAmount, setSalaryAmount] = useState<number | ''>('');
  const [salaryMonth, setSalaryMonth] = useState('');
  
  const navigate = useNavigate();

  const allLeaveRequests = allEmployees.flatMap(emp =>
    emp.leaveRequests.map(req => ({ ...req, employeeName: emp.name }))
  );

  const allSalaryHistory = allEmployees
    .flatMap(emp => 
      emp.salaryHistory.map(sal => ({
        ...sal,
        id: `${emp.id}-${sal.month}`,
        employeeName: emp.name,
      }))
    )
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());


  const handleApproveLeave = (leaveId: string) => {
    setAllEmployees(prevEmployees =>
      prevEmployees.map(emp => ({
        ...emp,
        leaveRequests: emp.leaveRequests.map(req =>
          req.id === leaveId ? { ...req, status: 'Approved' } : req
        ),
      }))
    );
    toast.success(`Leave request ${leaveId} has been approved.`);
  };
  
  const handleRejectLeave = (leaveId: string, reason: string) => {
    setAllEmployees(prevEmployees =>
      prevEmployees.map(emp => ({
        ...emp,
        leaveRequests: emp.leaveRequests.map(req =>
          req.id === leaveId
            ? { ...req, status: 'Rejected', rejectionReason: reason }
            : req
        ),
      }))
    );
    toast.error(`Leave request ${leaveId} has been rejected.`);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setAllEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    toast.info(`Employee ${employeeId} has been deleted.`);
  };

  const handleAddNewEmployee = (newEmployeeData: { name: string; email: string }) => {
    const newEmployee: Employee = {
      ...newEmployeeData,
      id: `emp-${crypto.randomUUID().slice(0, 4)}`,
      role: "Employee",
      attendance: [],
      salaryHistory: [],
      leaveRequests: [],
      notifications: [],
    };
    setAllEmployees(prev => [newEmployee, ...prev]);
  };

  const handleSendNotification = () => {
    if (!notificationMessage.trim()) {
      toast.error("Notification message cannot be empty.");
      return;
    }
    
    const recipientName = notificationRecipient === 'all'
      ? 'All Employees'
      : allEmployees.find(emp => emp.id === notificationRecipient)?.name || 'Unknown';

    const newNotification: SentNotification = {
      id: `sent-${crypto.randomUUID().slice(0, 4)}`,
      date: format(new Date(), "yyyy-MM-dd"),
      message: notificationMessage,
      recipient: recipientName,
    };
    
    setSentNotifications(prev => [newNotification, ...prev]);
    toast.success(`Notification sent to ${recipientName}.`);

    setNotificationMessage("");
    setNotificationRecipient("all");
  };

  const handleSalaryPunchIn = () => {
    if (!salaryEmployeeId || !salaryAmount || !salaryMonth.trim()) {
      toast.error("Please fill out all salary fields before punching in.");
      return;
    }

    setAllEmployees(prevEmployees => 
      prevEmployees.map(emp => {
        if (emp.id === salaryEmployeeId) {
          const newSalaryRecord: Salary = {
            month: salaryMonth,
            amount: Number(salaryAmount),
            status: 'Paid',
            date: format(new Date(), "yyyy-MM-dd"),
          };
          return {
            ...emp,
            salaryHistory: [newSalaryRecord, ...emp.salaryHistory],
          };
        }
        return emp;
      })
    );

    const employeeName = allEmployees.find(e => e.id === salaryEmployeeId)?.name;
    toast.success(`Salary of ₹${salaryAmount.toLocaleString()} for ${salaryMonth} punched in for ${employeeName}.`);
    
    setSalaryEmployeeId('');
    setSalaryAmount('');
    setSalaryMonth('');
  };

  const handleLogout = () => {
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
                    {allLeaveRequests.map((req) => (
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
                        <TableRow key={emp.id}>
                        <TableCell>{emp.id}</TableCell>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteEmployee(emp.id)}>Delete</Button>
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
                            {allEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
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
                      <TableRow key={notif.id}>
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
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
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
                  {allSalaryHistory.map((sal) => (
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
