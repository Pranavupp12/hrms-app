import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: { title: string; description: string; date: string; time: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function AddEventModal({ isOpen, onClose, onSubmit, isSubmitting = false }: AddEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // ✅ 1. Get today's date in the correct 'YYYY-MM-DD' format
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Reset state when the modal opens
    if (isOpen) {
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title || !date || !time) {
      return toast.error("Title, date, and time are required.");
    }
    if (date < today) {
      return toast.error("Cannot create an event for a past date.");
    }
    try {
      await onSubmit({ title, description, date, time }); // ✅ 6. Await submit
      onClose(); // Only close on success
    } catch (error) {
      // Parent function should show the error toast
      console.error("Failed to submit event:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New Event</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div><Label htmlFor="title">Title</Label><Input id="title" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label htmlFor="date">Date</Label><Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} min={today} /></div>
          <div><Label htmlFor="time">Time</Label><Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          <div><Label htmlFor="description">Description (Optional)</Label><Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}> {/* ✅ 8. Disable */}
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Event'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}