import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Employee, Task } from "@/types";
import { Loader2 } from "lucide-react"; // ✅ 1. Import Loader

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ✅ 2. Allow onSubmit to be async
  onSubmit: (taskData: {
    title: string;
    description: string;
    date: string;
    time: string;
    assignedTo: string;
  }) => Promise<void> | void;
  employees: Employee[];
  taskToUpdate?: Task | null;
  isSubmitting?: boolean; // ✅ 3. Add isSubmitting prop
}

export function AssignTaskModal({
  isOpen,
  onClose,
  onSubmit,
  employees,
  taskToUpdate = null,
  isSubmitting = false, // ✅ 4. Accept prop
}: AssignTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const isEditMode = taskToUpdate !== null;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && taskToUpdate) {
        setTitle(taskToUpdate.title);
        setDescription(taskToUpdate.description || "");
        setDate(taskToUpdate.date.slice(0, 10));
        setTime(taskToUpdate.time);
        setAssignedTo(taskToUpdate.assignedTo._id);
      } else {
        setTitle("");
        setDescription("");
        setDate("");
        setTime("");
        setAssignedTo("");
      }
    }
  }, [isOpen, taskToUpdate, isEditMode]);

  const handleSubmit = async () => { // ✅ 5. Make async
    if (!title || !date || !time || !assignedTo) {
      return toast.error("Title, Date, Time, and Assigned Employee are required.");
    }
    if (date < today && !isEditMode) {
      return toast.error("Cannot create task for a past date.");
    }

    try {
      await onSubmit({ title, description, date, time, assignedTo }); // ✅ 6. Await submit
      onClose(); // Only close on success
    } catch (error) {
      // Parent component will show the error toast
      console.error("Task submission failed:", error);
      // Don't close modal if it failed
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Update Task" : "Assign New Task"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSubmitting} /> {/* ✅ 7. Disable */}
          </div>
          <div>
            <Label htmlFor="assignedTo">Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={isSubmitting}> {/* ✅ 7. Disable */}
              <SelectTrigger>
                <SelectValue placeholder="Select an employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp._id} value={emp._id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={!isEditMode ? today : undefined}
              disabled={isSubmitting} /* ✅ 7. Disable */
            />
          </div>
          <div>
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={isSubmitting} /> {/* ✅ 7. Disable */}
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting} /* ✅ 7. Disable */
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}> {/* ✅ 8. Disable */}
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}> {/* ✅ 8. Disable */}
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditMode ? (
              "Update Task"
            ) : (
              "Save Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}