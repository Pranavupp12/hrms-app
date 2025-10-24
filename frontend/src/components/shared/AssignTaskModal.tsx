import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Employee, Task } from "@/types";

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: { 
    title: string; 
    description: string; 
    date: string; 
    time: string; 
    assignedTo: string; 
  }) => void;
  employees: Employee[];
  taskToUpdate?: Task | null;
}

export function AssignTaskModal({ isOpen, onClose, onSubmit, employees, taskToUpdate = null }: AssignTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const isEditMode = taskToUpdate !== null;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && taskToUpdate) {
        setTitle(taskToUpdate.title);
        setDescription(taskToUpdate.description || '');
        setDate(taskToUpdate.date.slice(0, 10));
        setTime(taskToUpdate.time);
        setAssignedTo(taskToUpdate.assignedTo._id);
      } else {
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
        setAssignedTo('');
      }
    }
  }, [isOpen, taskToUpdate, isEditMode]);

  const handleSubmit = () => {
    if (!title || !date || !time || !assignedTo) {
      return toast.error("Title, Date, Time, and Assigned Employee are required.");
    }
    if (date < today && !isEditMode) {
      return toast.error("Cannot create task for a past date.");
    }
    
    onSubmit({ title, description, date, time, assignedTo });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditMode ? 'Update Task' : 'Assign New Task'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div><Label htmlFor="title">Title</Label><Input id="title" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div>
            <Label htmlFor="assignedTo">Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Select an employee..." /></SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="date">Date</Label><Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} min={!isEditMode ? today : undefined} /></div>
          <div><Label htmlFor="time">Time</Label><Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          <div><Label htmlFor="description">Description (Optional)</Label><Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEditMode ? 'Update Task' : 'Save Task'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}