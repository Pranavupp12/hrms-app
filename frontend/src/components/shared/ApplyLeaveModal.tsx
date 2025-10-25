import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "@/types";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ApplyLeaveModalProps {
  onSubmit: (newLeaveRequest: Omit<LeaveRequest, '_id' | 'status' | 'id'>) => Promise<void> | void;
  children: React.ReactNode;
  isSubmitting?: boolean;
}

export function ApplyLeaveModal({ onSubmit, children , isSubmitting = false }: ApplyLeaveModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState<string>("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset state when modal is closed/opened or leave type changes
  useEffect(() => {
    if (!isOpen) {
      setLeaveType("");
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
    } else {
        // Reset dates if leave type changes after opening
        setStartDate(undefined);
        setEndDate(undefined);
    }
  }, [isOpen]);

  // Reset end date if leave type changes away from Sick Leave
  useEffect(() => {
      if (leaveType !== "Sick Leave") {
          setEndDate(undefined);
      }
  }, [leaveType]);


  const handleApplyLeave = async () => {
    // Basic validation
    if (!leaveType || !startDate) {
      toast.error("Please select a leave type and date(s).");
      return;
    }

    // Date validation
    if (startDate < today) {
      toast.error("Cannot apply for leave on a past date.");
      return;
    }

    let finalEndDate = startDate; // Default end date for single-day leaves

    // Specific validation for Sick Leave (multi-day)
    if (leaveType === "Sick Leave") {
      if (!endDate) {
        toast.error("Please select an end date for sick leave.");
        return;
      }
      if (endDate < startDate) {
        toast.error("End date cannot be before the start date.");
        return;
      }
      finalEndDate = endDate; // Use the selected end date
    }

    // Construct the request object
    const newLeaveRequest = {
      type: leaveType,
      startDate: format(startDate!, "yyyy-MM-dd"),
      endDate: format(finalEndDate, "yyyy-MM-dd"), // Use finalEndDate
      reason: reason,
    };

    try {
        await onSubmit(newLeaveRequest); // Let parent handle success toast
        setIsOpen(false); // Close modal on success

        // Reset fields only after successful submission
        setLeaveType("");
        setStartDate(undefined);
        setEndDate(undefined);
        setReason("");
    } catch (error) {
        // Parent component should handle error toast
        console.error("Leave submission failed:", error);
    }
  };

  const isSickLeave = leaveType === "Sick Leave";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Leave Type Select */}
          <Select onValueChange={setLeaveType} value={leaveType}>
            <SelectTrigger><SelectValue placeholder="Select Leave Type *" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Sick Leave">Sick Leave</SelectItem>
              <SelectItem value="Paid Leave">Paid Leave</SelectItem>
              <SelectItem value="Short Leave">Short Leave</SelectItem>
              <SelectItem value="Half Day">Half Day</SelectItem>
            </SelectContent>
          </Select>

          {/* Start Date / Single Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate
                  ? format(startDate, "PPP")
                  : <span>{isSickLeave ? "Pick a start date *" : "Pick a date *"}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={{ before: today }} // Disable past dates
                autoFocus
              />
            </PopoverContent>
          </Popover>

          {/* End Date Picker (Conditional) */}
          {isSickLeave && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                  disabled={!startDate} // Disable if start date isn't picked yet
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate
                    ? format(endDate, "PPP")
                    : <span>Pick an end date *</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  // Disable dates before the selected start date or today
                  disabled={{ before: startDate || today }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Reason Textarea */}
          <Textarea
            placeholder="Enter the reason for your leave (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
          />

          {/* Submit Button */}
          <Button onClick={handleApplyLeave} disabled={isSubmitting}> {/* ✅ Disable button */}
            {isSubmitting ? ( // ✅ Conditional rendering
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
