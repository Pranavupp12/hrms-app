import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Employee, AdditionalDetails, FileData } from "@/types";
import { toast } from "sonner";
import api from "@/api";

interface ManageUploadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onDataChange: () => void;
}

const documentFields = [
  { key: 'tenthMarksheet', label: '10th Marksheet' },
  { key: 'twelfthMarksheet', label: '12th Marksheet' },
  { key: 'resume', label: 'Resume' },
  { key: 'panCardFront', label: 'PAN Card' },
  { key: 'aadharCardFront', label: 'Aadhaar Card (Front)' },
  { key: 'aadharCardBack', label: 'Aadhaar Card (Back)' },
  { key: 'cancelledCheque', label: 'Cancelled Cheque' },
];

export function ManageUploadsModal({ isOpen, onClose, employee, onDataChange}: ManageUploadsModalProps) {
  if (!employee) return null;

  const handleGrantAccess = async (field: string, label: string) => {
    try {
      await api.put('/admin/grant-reupload-access', {
        employeeId: employee._id,
        field: field,
      });
      toast.success(`Access granted for ${label}. The employee can now re-upload this document.`);
      onDataChange();
    } catch (error) {
      toast.error("Failed to grant access.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl"> {/* Increased width for new column */}
        <DialogHeader>
          <DialogTitle>Manage Uploads for {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current File</TableHead> {/* ✅ 1. Add new table header */}
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {documentFields.map(({ key, label }) => {
                
                // Get the file field and the reuploadAccess array
                const field = employee.additionalDetails?.[key as keyof AdditionalDetails] as FileData | undefined;
                const reuploadAccess = employee.additionalDetails?.reuploadAccess || [];

                // Check all possible states
                const isUploaded = !!(field && field.path);
                const hasReuploadAccess = reuploadAccess.includes(key);

                let statusElement;
                if (hasReuploadAccess) {
                    // State 1: Access has been granted
                    statusElement = <span className="text-yellow-600 font-semibold">Re-upload Granted</span>;
                } else if (isUploaded) {
                    // State 2: File is uploaded and locked
                    statusElement = <span className="text-green-600 font-semibold">Uploaded</span>;
                } else {
                    // State 3: Not yet uploaded
                    statusElement = <span className="text-gray-500">Not Uploaded</span>;
                }

                return (
                    <TableRow key={key}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell>
                        {statusElement} {/* ✅ Use the new status logic */}
                    </TableCell>

                    <TableCell>
                        {isUploaded ? (
                        <a
                            href={field.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            {field.originalName || 'View File'}
                        </a>
                        ) : (
                        <span className="text-gray-400">N/A</span>
                        )}
                    </TableCell>

                    <TableCell className="text-right">
                        {isUploaded && (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleGrantAccess(key,label)}
                            disabled={hasReuploadAccess} /* ✅ Disable if already granted */
                        >
                            {hasReuploadAccess ? 'Access Granted' : 'Grant Re-upload Access'}
                        </Button>
                        )}
                    </TableCell>
                    </TableRow>
                );
                })}
            </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}