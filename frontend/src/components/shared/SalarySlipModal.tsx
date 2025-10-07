import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slipPath?: string;
}

export function SalarySlipModal({ isOpen, onClose, slipPath }: SalarySlipModalProps) {
  if (!slipPath) return null;

  // Construct the full URL to the PDF, ensuring the backend URL is correct
  const pdfUrl = `http://localhost:5001/${slipPath.replace(/\\/g, '/')}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Salary Slip</DialogTitle>
        </DialogHeader>
        <div className="flex-grow w-full px-6 pb-6">
          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            title="Salary Slip"
            style={{ border: 'none' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}