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
    PunchStatus,
    Salary
} from "@/types";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../api";
import { Bell, UserCircle2, LogOut, Clock, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

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

// Helper to format the sent time, now safely handles missing timestamps
const formatSentTime = (dateTimeString?: string) => {
    if (!dateTimeString) {
        return 'N/A';
    }
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        return 'N/A';
    }
};


export function HrDashboard() {
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
    const [hrNotifications, setHrNotifications] = useState<AppNotification[]>([]);
    const [hrAttendance, setHrAttendance] = useState<Attendance[]>([]);
    const [hrSalaryHistory, setHrSalaryHistory] = useState<Salary[]>([]);
    const [allUserAttendance, setAllUserAttendance] = useState<AllUserAttendance[]>([]);

    const [filteredHrNotifications, setFilteredHrNotifications] = useState<AppNotification[]>([]);
    const [notificationFilter, setNotificationFilter] = useState<'all' | 'today'>('all');
    const [allAttendanceFilter, setAllAttendanceFilter] = useState<'today' | 'all'>('today');

    const [notificationMessage, setNotificationMessage] = useState("");
    const [notificationRecipients, setNotificationRecipients] = useState<string[]>(["all"]);

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
                hrSalaryRes,
            ] = await Promise.all([
                api.get("/hr/employees"),
                api.get("/hr/notifications"),
                api.get(`/hr/${user.id}/notifications`),
                api.get(`/hr/${user.id}/attendance`),
                api.get(attendanceEndpoint),
                api.get(`/hr/${user.id}/salaries`),
            ]);

            setAllEmployees(employeesRes.data);
            setSentNotifications(sentNotificationsRes.data);
            setHrNotifications(hrNotificationsRes.data);
            setHrAttendance(hrAttendanceRes.data);
            setAllUserAttendance(allAttendanceRes.data);
            setHrSalaryHistory(hrSalaryRes.data);

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

        if (notificationRecipients.length === 0) {
            toast.error("Please select at least one recipient.");
            return;
        }

        try {
            const recipientData = notificationRecipients.includes('all') ? 'all' : notificationRecipients;

            await api.post("/hr/notifications", {
                recipient: recipientData,
                message: notificationMessage,
                senderId: user.id,
            });

            fetchData();
            toast.success(`Notification sent.`);
            setNotificationMessage("");
            setNotificationRecipients(['all']);
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
                    <TabsTrigger value="salary">My Salary</TabsTrigger>
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
                                            <TableCell>{formatDate(att.date)}</TableCell>
                                            <TableCell>{formatTime(att.checkIn || "--")}</TableCell>
                                            <TableCell>{formatTime(att.checkOut || "--")}</TableCell>
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
                                            <TableCell>{formatDate(att.date)}</TableCell>
                                            <TableCell>{formatTime(att.checkIn || "--")}</TableCell>
                                            <TableCell>{formatTime(att.checkOut || "--")}</TableCell>
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
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                        >
                                            <div className="flex gap-1 flex-wrap">
                                                {notificationRecipients.includes('all') ? (
                                                    <Badge>All Employees</Badge>
                                                ) : (
                                                    allEmployees
                                                        .filter(emp => notificationRecipients.includes(emp._id))
                                                        .map(emp => <Badge key={emp._id}>{emp.name}</Badge>)
                                                )}
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Search employees..." />
                                            <CommandList>
                                                <CommandEmpty>No employee found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={() => {
                                                            setNotificationRecipients(['all']);
                                                        }}
                                                    >
                                                        All Employees
                                                    </CommandItem>
                                                    {allEmployees.map((employee) => (
                                                        <CommandItem
                                                            key={employee._id}
                                                            onSelect={() => {
                                                                if (notificationRecipients.includes('all')) {
                                                                    setNotificationRecipients([employee._id]);
                                                                } else if (notificationRecipients.includes(employee._id)) {
                                                                    setNotificationRecipients(
                                                                        notificationRecipients.filter((id) => id !== employee._id)
                                                                    );
                                                                } else {
                                                                    setNotificationRecipients([...notificationRecipients, employee._id]);
                                                                }
                                                            }}
                                                        >
                                                            {employee.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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
                                        <TableHead>Time</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Sent By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sentNotifications.map((notif) => (
                                        <TableRow key={notif._id}>
                                            <TableCell className="whitespace-nowrap">
                                                {formatDate(notif.date)}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {formatSentTime(notif.sentAt)}
                                            </TableCell>
                                            <TableCell className="max-w-md truncate">
                                                {notif.message}
                                            </TableCell>
                                            <TableCell>{notif.recipient}</TableCell>
                                            <TableCell>
                                                {notif.sentBy ? `${notif.sentBy.name} (${notif.sentBy.role})` : 'N/A'}
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
                                                    className={`mt-1.5 h-2 w-2 rounded-full ${notification.status === "unread"
                                                        ? "bg-blue-500"
                                                        : "bg-gray-300"
                                                        }`}
                                                />
                                                <div className="flex flex-col">
                                                    <p
                                                        className={`text-sm ${notification.status === "unread"
                                                            ? "font-semibold text-primary"
                                                            : "text-muted-foreground"
                                                            }`}
                                                    >
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatDate(notification.date)}
                                                    </p>
                                                    {notification.sentBy && (
                                                        <p className="text-xs font-semibold text-muted-foreground mt-1">
                                                            - {notification.sentBy.name} ({notification.sentBy.role})
                                                        </p>
                                                    )}
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
                <TabsContent value="salary" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Salary History</CardTitle>
                        </CardHeader>
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
                                    {hrSalaryHistory.map((sal) => (
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
            </Tabs>
        </div>
    );
}