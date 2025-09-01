import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // 1. Import Textarea
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "@/types";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ApplyLeaveModalProps {
  onSubmit: (newLeaveRequest: Omit<LeaveRequest, 'id'>) => void;
  children: React.ReactNode;
}

export function ApplyLeaveModal({ onSubmit, children }: ApplyLeaveModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState<string>(""); // 2. Add state for the reason

  const handleApplyLeave = () => {
    if (!leaveType || !startDate || !endDate) {
      toast.error("Please fill out the required fields.");
      return;
    }

    const newLeaveRequest = {
      type: leaveType,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      status: "Pending" as const,
      reason: reason, // 3. Include the reason in the submitted data
    };

    onSubmit(newLeaveRequest);
    toast.success("Leave request submitted successfully!");
    setIsOpen(false);

    // Reset all form fields after submission
    setLeaveType("");
    setStartDate(undefined);
    setEndDate(undefined);
    setReason(""); // 4. Reset the reason field
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <Select onValueChange={setLeaveType} value={leaveType}>
            <SelectTrigger><SelectValue placeholder="Select Leave Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Sick Leave">Sick Leave</SelectItem>
              <SelectItem value="Vacation">Vacation</SelectItem>
              <SelectItem value="Personal Leave">Personal Leave</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
          </Popover>
          {/* 5. Add the Textarea for the reason */}
          <Textarea
            placeholder="Enter the reason for your leave (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button onClick={handleApplyLeave}>Submit Request</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}