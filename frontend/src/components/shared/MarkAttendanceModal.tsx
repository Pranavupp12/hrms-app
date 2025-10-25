import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { manualAttendanceStatuses } from "@/types"; // Import the array from your types file
import { Loader2 } from "lucide-react"; // ✅ 1. Import Loader

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newStatus: string) => Promise<void> | void; // ✅ 2. Allow async
  employeeName: string;
  role: string;
  date: string;
  currentStatus: string;
  isSubmitting?: boolean; // ✅ 3. Add isSubmitting prop
}

export function MarkAttendanceModal({
  isOpen,
  onClose,
  onSubmit,
  employeeName,
  role,
  date,
  currentStatus,
  isSubmitting = false // ✅ 4. Accept prop
}: MarkAttendanceModalProps) {
  const [newStatus, setNewStatus] = useState(currentStatus);

  // Update local state if the currentStatus prop changes (e.g., modal re-opens)
  useEffect(() => {
    setNewStatus(currentStatus);
  }, [currentStatus, isOpen]);

  const handleSubmit = async () => { // ✅ 5. Make async
    try {
      await onSubmit(newStatus);
      onClose(); // Close only on success
    } catch (error) {
      // Parent component will show the error toast
      console.error("Failed to mark attendance:", error);
      // Don't close modal if it failed
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Attendance for {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Role:</Label>
            <p className="col-span-3 font-semibold">{role}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Date:</Label>
            <p className="col-span-3 font-semibold">{date}</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status:
            </Label>
            <Select value={newStatus} onValueChange={setNewStatus} disabled={isSubmitting}> {/* ✅ 6. Disable */}
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {manualAttendanceStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button> {/* ✅ 7. Disable */}
          <Button onClick={handleSubmit} disabled={isSubmitting}> {/* ✅ 7. Disable */}
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}