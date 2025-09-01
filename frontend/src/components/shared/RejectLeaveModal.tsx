import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

interface RejectLeaveModalProps {
  children: React.ReactNode;
  onSubmit: (reason: string) => void;
}

export function RejectLeaveModal({ children, onSubmit }: RejectLeaveModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Rejection reason cannot be empty.");
      return;
    }
    onSubmit(reason);
    setIsOpen(false);
    setReason(""); // Reset for next time
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reason for Rejection</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="rejection-reason">Please provide a reason for rejecting this leave request.</Label>
            <Textarea
              id="rejection-reason"
              className="mt-2"
              placeholder="e.g., Conflicts with project deadlines..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button variant="destructive" onClick={handleSubmit}>Confirm Rejection</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}