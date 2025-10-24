import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/types";
import { Loader2, Calendar, Clock } from "lucide-react";

// Helper functions for formatting
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};
const formatTime = (timeString?: string) => {
  if (!timeString) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

interface ViewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: string) => void;
  task: Task | null;
  isCompleting?: boolean;
}

export function ViewTaskModal({ isOpen, onClose, onComplete, task, isCompleting = false }: ViewTaskModalProps) {
  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{task.title}</DialogTitle>
          <DialogDescription className="pt-2">
            Assigned by: <span className="font-medium text-primary">{task.createdBy?.name || 'N/A'}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Badge variant={task.status === 'Completed' ? 'default' : 'outline'} className="text-sm">{task.status}</Badge>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span>Due on: {formatDate(task.date)}</span>
            <Clock className="ml-6 mr-2 h-4 w-4" />
            <span>at {formatTime(task.time)}</span>
          </div>
          {task.description && (
            <div className="text-sm">
              <h4 className="font-semibold mb-2">Description:</h4>
              <p className="p-4 bg-slate-50 rounded-md border text-muted-foreground">{task.description}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {task.status === 'Pending' && (
            <Button onClick={() => onComplete(task._id)} disabled={isCompleting}>
              {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Complete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}