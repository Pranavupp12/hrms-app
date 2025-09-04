// frontend/src/pages/hr/HrDashboard.tsx

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type {
  Employee,
  SentNotification,
  AppNotification,
  Attendance,
  AllUserAttendance,
  PunchStatus
} from "@/types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../api";
import { Bell, UserCircle2, LogOut, Clock } from "lucide-react";

export function HrDashboard() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
  const [hrNotifications, setHrNotifications] = useState<AppNotification[]>([]);
  const [hrAttendance, setHrAttendance] = useState<Attendance[]>([]);
  const [allUserAttendance, setAllUserAttendance] = useState<AllUserAttendance[]>([]);
  
  const [filteredHrNotifications, setFilteredHrNotifications] = useState<AppNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'today'>('all');
  const [allAttendanceFilter, setAllAttendanceFilter] = useState<'today' | 'all'>('today');

  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationRecipient, setNotificationRecipient] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [hrPunchStatus, setHrPunchStatus] = useState<PunchStatus>('punched-out');

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const attendanceEndpoint = allAttendanceFilter === 'today' 
        ? '/hr/attendance/today' 
        : '/hr/attendance/all';

      const [
        employeesRes,
        sentNotificationsRes,
        hrNotificationsRes,
        hrAttendanceRes,
        allAttendanceRes,
      ] = await Promise.all([
        api.get("/hr/employees"),
        api.get("/hr/notifications"),
        api.get(`/hr/${user.id}/notifications`),
        api.get(`/hr/${user.id}/attendance`),
        api.get(attendanceEndpoint),
      ]);

      setAllEmployees(employeesRes.data);
      setSentNotifications(sentNotificationsRes.data);
      setHrNotifications(hrNotificationsRes.data);
      setHrAttendance(hrAttendanceRes.data);
      setAllUserAttendance(allAttendanceRes.data);

      const today = new Date().toISOString().slice(0, 10);
      const myTodaysAttendance = hrAttendanceRes.data.find((att: any) => att.date === today);
      if (myTodaysAttendance) {
        if (myTodaysAttendance.checkOut) {
          setHrPunchStatus('completed');
        } else {
          setHrPunchStatus('punched-in');
        }
      } else {
        setHrPunchStatus('punched-out');
      }

      const unreadNotifications = hrNotificationsRes.data.some(
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
      toast.error("Failed to fetch dashboard data.");
    }
  };

  useEffect(() => {
    if (!user?.id || user.role !== "HR") {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user.id, navigate, allAttendanceFilter]);

  useEffect(() => {
    if (notificationFilter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      setFilteredHrNotifications(hrNotifications.filter(n => n.date === today));
    } else {
      setFilteredHrNotifications(hrNotifications);
    }
  }, [hrNotifications, notificationFilter]);

  const handleHrPunchIn = async () => {
    try {
      await api.post(`/hr/${user.id}/punch-in`);
      setHrPunchStatus('punched-in');
      toast.success("Punched in successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to punch in.");
    }
  };
  
  const handleHrPunchOut = async () => {
    try {
      await api.post(`/hr/${user.id}/punch-out`);
      setHrPunchStatus('completed');
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

  const openViewModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (formData: FormData) => {
    try {
      await api.post("/hr/employees", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const role = formData.get("role");
      toast.success(`New ${role} added successfully.`);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save employee.");
    }
  };

  const handleSendNotification = async () => {
    if (!notificationMessage.trim()) {
      toast.error("Notification message cannot be empty.");
      return;
    }

    try {
      await api.post("/hr/notifications", {
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
      await api.put(`/hr/${user.id}/notifications/${notificationId}`);
      fetchData();
      toast.info("Notification marked as read.");
    } catch (error) {
      toast.error("Failed to mark notification as read.");
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
        isHr={true}
      />
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Welcome HR, {user.name}!</h1>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle2 size={28} />
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
            <LogOut size={28} />
          </Button>
        </div>
      </div>
      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="employees">Employee Management</TabsTrigger>
          <TabsTrigger value="notifications">Send Notification</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-6 w-6" /> Mark Your Attendance
              </CardTitle>
              <CardDescription>
                {currentTime.toLocaleDateString("en-GB", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="text-6xl font-bold font-mono">
                {currentTime.toLocaleTimeString("en-US")}
              </div>
              {hrPunchStatus === "punched-out" && (
                <Button
                  size="lg"
                  className="w-48"
                  onClick={handleHrPunchIn}
                >
                  Punch In
                </Button>
              )}
              {hrPunchStatus === "punched-in" && (
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-48"
                  onClick={handleHrPunchOut}
                >
                  Punch Out
                </Button>
              )}
              {hrPunchStatus === "completed" && (
                <p className="text-green-600 font-semibold">
                  Your attendance for today has been completed.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>My Attendance Record</CardTitle>
            </CardHeader>
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
                  {hrAttendance.map((att) => (
                    <TableRow key={`my-att-${att.date}`}>
                      <TableCell>{att.date}</TableCell>
                      <TableCell>{att.checkIn || "--"}</TableCell>
                      <TableCell>{att.checkOut || "--"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            att.status === "Present"
                              ? "default"
                              : "destructive"
                          }
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All User Attendance</CardTitle>
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant={
                      allAttendanceFilter === "all" ? "default" : "outline"
                    }
                    onClick={() => setAllAttendanceFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      allAttendanceFilter === "today" ? "default" : "outline"
                    }
                    onClick={() => setAllAttendanceFilter("today")}
                  >
                    Today
                  </Button>
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
                    <TableRow
                      key={`${att.employeeName}-${att.date}-${index}`}
                    >
                      <TableCell>{att.employeeName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{att.role}</Badge>
                      </TableCell>
                      <TableCell>{att.date}</TableCell>
                      <TableCell>{att.checkIn || "--"}</TableCell>
                      <TableCell>{att.checkOut || "--"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            att.status === "Present"
                              ? "default"
                              : att.status === "Punched In"
                              ? "default"
                              : att.status === "Absent"
                              ? "destructive"
                              : "outline"
                          }
                          className={
                            att.status === "Not Punched In"
                              ? "bg-gray-200 text-gray-700"
                              : ""
                          }
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
                {filteredHrNotifications.length > 0 ? (
                  filteredHrNotifications.map((notification) => (
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
      </Tabs>
    </div>
  );
}