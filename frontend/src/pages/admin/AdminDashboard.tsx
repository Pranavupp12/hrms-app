import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmployeeModal } from "../../components/shared/EmployeeModal";
import { RejectLeaveModal } from "../../components/shared/RejectLeaveModal";
import type {
  Employee,
  Salary,
  SentNotification,
  LeaveRequest,
  AppNotification,
} from "@/types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../api";
import { Bell, UserCircle2, LogOut } from "lucide-react";

export function AdminDashboard() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<
    (LeaveRequest & { employeeName: string; id: string })[]
  >([]);
  const [salaryHistory, setSalaryHistory] = useState<
    (Salary & { employeeName: string; id: string })[]
  >([]);
  const [sentNotifications, setSentNotifications] = useState<
    SentNotification[]
  >([]);
  const [adminNotifications, setAdminNotifications] = useState<AppNotification[]>(
    []
  );

  const [filteredAdminNotifications, setFilteredAdminNotifications] = useState<AppNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'today'>('all');
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationRecipient, setNotificationRecipient] = useState("all");
  const [salaryEmployeeId, setSalaryEmployeeId] = useState("");
  const [salaryAmount, setSalaryAmount] = useState<number | "">("");
  const [salaryMonth, setSalaryMonth] = useState("");

  // State for the employee modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchData = async () => {
    try {
      const [
        employeesRes,
        leavesRes,
        salariesRes,
        sentNotificationsRes,
        adminNotificationsRes,
      ] = await Promise.all([
        api.get("/admin/employees"),
        api.get("/admin/leave-requests"),
        api.get("/admin/salaries"),
        api.get("/admin/notifications"),
        api.get(`/admin/${user.id}/notifications`),
      ]);
      setAllEmployees(employeesRes.data);
      setLeaveRequests(leavesRes.data);
      setSalaryHistory(salariesRes.data);
      setSentNotifications(sentNotificationsRes.data);
      setAdminNotifications(adminNotificationsRes.data);

      const unreadNotifications = adminNotificationsRes.data.some(
        (n: any) => n.status === "unread"
      );
      const hasShownLoginToast = sessionStorage.getItem(
        "loginNotificationShown"
      );

      if (unreadNotifications && !hasShownLoginToast) {
        toast.info("You have new messages. Please check your notifications!");
        sessionStorage.setItem("loginNotificationShown", "true");
      }
    } catch (error) {
      toast.error("Failed to fetch data.");
      console.error(error);
    }
  };

  useEffect(() => {
    if (!user?.id || user.role !== "Admin") {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user.id, navigate]);

  useEffect(() => {
    if (notificationFilter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      setFilteredAdminNotifications(adminNotifications.filter(n => n.date === today));
    } else {
      setFilteredAdminNotifications(adminNotifications);
    }
  }, [adminNotifications, notificationFilter]);

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

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await api.delete(`/admin/employees/${employeeId}`);
      fetchData();
      toast.info(`Employee has been deleted.`);
    } catch (error) {
      toast.error("Failed to delete employee.");
    }
  };

  const handleSendNotification = async () => {
    if (!notificationMessage.trim()) {
      toast.error("Notification message cannot be empty.");
      return;
    }

    try {
      await api.post("/admin/notifications", {
        recipient: notificationRecipient,
        message: notificationMessage,
      });
      fetchData();
      toast.success(`Notification sent.`);
      setNotificationMessage("");
      setNotificationRecipient("all");
    } catch (error) {
      toast.error("Failed to send notification.");
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.put(`/admin/${user.id}/notifications/${notificationId}`);
      fetchData();
      toast.info("Notification marked as read.");
    } catch (error) {
      toast.error("Failed to mark notification as read.");
    }
  };

  const handleSalaryPunchIn = async () => {
    if (!salaryEmployeeId || !salaryAmount || !salaryMonth.trim()) {
      toast.error("Please fill out all salary fields.");
      return;
    }

    try {
      await api.post("/admin/salary", {
        employeeId: salaryEmployeeId,
        amount: salaryAmount,
        month: salaryMonth,
      });
      fetchData();
      toast.success(`Salary punched in.`);
      setSalaryEmployeeId("");
      setSalaryAmount("");
      setSalaryMonth("");
    } catch (error) {
      toast.error("Failed to punch in salary.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("loginNotificationShown");
    toast.success("You have been logged out.");
    navigate("/login");
  };

  return (
    <div className="p-8">
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveEmployee}
        employee={editingEmployee}
        viewMode={isViewMode}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Welcome Admin, {user.name}!</h1>
         <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle2 className="h-8 w-8" />
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
            <LogOut className="h-8 w-8" />
          </Button>
        </div>
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
            <CardHeader>
              <CardTitle>Pending Leave Requests</CardTitle>
            </CardHeader>
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
                      <TableCell>
                        {req.startDate} to {req.endDate}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {req.reason || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge>{req.status}</Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        {req.status === "Pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveLeave(req.id)}
                            >
                              Approve
                            </Button>
                            <RejectLeaveModal
                              onSubmit={(reason) =>
                                handleRejectLeave(req.id, reason)
                              }
                            >
                              <Button size="sm" variant="destructive">
                                Reject
                              </Button>
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
                      <TableCell>
                        <Badge>{emp.role}</Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewModal(emp)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(emp)}
                        >
                          Update
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEmployee(emp._id)}
                        >
                          Delete
                        </Button>
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
            <CardHeader>
              <CardTitle>Send a New Notification</CardTitle>
            </CardHeader>
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
                  {allEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
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
              <Button onClick={handleSendNotification}>
                Send Notification
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sent Notifications History</CardTitle>
            </CardHeader>
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
                  {sentNotifications.map((notif) => (
                    <TableRow key={notif._id}>
                      <TableCell className="whitespace-nowrap">
                        {notif.date}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {notif.message}
                      </TableCell>
                      <TableCell>{notif.recipient}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
                {filteredAdminNotifications.length > 0 ? (
                  filteredAdminNotifications.map((notification) => (
                    <div
                      key={notification._id}
                      className="flex items-start justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-start space-x-4">
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full ${
                            notification.status === "unread"
                              ? "bg-blue-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <div className="flex flex-col">
                          <p
                            className={`text-sm ${
                              notification.status === "unread"
                                ? "font-semibold text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.date}
                          </p>
                        </div>
                      </div>
                      {notification.status === "unread" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification._id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    You have no new notifications for this period.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary-punch" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Punch In Employee Salary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="salary-employee">Select Employee</Label>
                <select
                  id="salary-employee"
                  className="w-full p-2 border rounded mt-1 bg-background"
                  value={salaryEmployeeId}
                  onChange={(e) => setSalaryEmployeeId(e.target.value)}
                >
                  <option value="" disabled>
                    Select an employee...
                  </option>
                  {allEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
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
                  onChange={(e) =>
                    setSalaryAmount(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="salary-month">
                  Salary Period (e.g., August 2025)
                </Label>
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
            <CardHeader>
              <CardTitle>Salary Punch-In History</CardTitle>
            </CardHeader>
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
                      <TableCell>{sal.date || "N/A"}</TableCell>
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

