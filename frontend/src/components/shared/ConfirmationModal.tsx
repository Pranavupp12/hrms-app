import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"; // ✅ 1. Import Loader

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void; // ✅ 2. Allow async
  title: string;
  description: string;
  isSubmitting?: boolean; // ✅ 3. Add isSubmitting prop
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isSubmitting = false, // ✅ 4. Accept prop
}: ConfirmationModalProps) {
  
  const handleConfirm = async () => { // ✅ 5. Make async
    try {
      await onConfirm();
      // We'll let the parent component close the modal on success
      // by calling onClose() or by re-fetching data which causes the modal to close.
    } catch (error) {
      console.error("Confirmation action failed:", error);
      // Parent should show toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}> {/* ✅ 6. Disable */}
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}> {/* ✅ 6. Disable */}
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}