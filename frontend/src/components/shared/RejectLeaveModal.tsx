import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react"; // ✅ 1. Import Loader

interface RejectLeaveModalProps {
  children: React.ReactNode;
  onSubmit: (reason: string) => Promise<void> | void; // ✅ 2. Allow async
  isSubmitting?: boolean; // ✅ 3. Add isSubmitting prop
}

export function RejectLeaveModal({
  children,
  onSubmit,
  isSubmitting = false, // ✅ 4. Accept prop
}: RejectLeaveModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => { // ✅ 5. Make async
    if (!reason.trim()) {
      toast.error("Rejection reason cannot be empty.");
      return;
    }

    try {
      await onSubmit(reason); // ✅ 6. Await submit
      setIsOpen(false);
      setReason(""); // Reset for next time
    } catch (error) {
      // Parent component will show the error toast
      console.error("Failed to reject leave:", error);
      // Don't close modal if it failed
    }
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
            <Label htmlFor="rejection-reason">
              Please provide a reason for rejecting this leave request.
            </Label>
            <Textarea
              id="rejection-reason"
              className="mt-2"
              placeholder="e.g., Conflicts with project deadlines..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting} // ✅ 7. Disable
            />
          </div>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}> {/* ✅ 8. Disable */}
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              "Confirm Rejection"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}