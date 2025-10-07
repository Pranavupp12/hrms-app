// frontend/src/components/shared/MarkAttendanceModal.tsx

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
import { useState } from "react";
import { manualAttendanceStatuses } from "@/types"; // Import the array from your types file

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newStatus: string) => void;
  employeeName: string;
  role: string;
  date: string;
  currentStatus: string;
}

export function MarkAttendanceModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    employeeName, 
    role, 
    date, 
    currentStatus 
}: MarkAttendanceModalProps) {
  const [newStatus, setNewStatus] = useState(currentStatus);

  const handleSubmit = () => {
    onSubmit(newStatus);
    onClose();
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
            <Select value={newStatus} onValueChange={setNewStatus}>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}