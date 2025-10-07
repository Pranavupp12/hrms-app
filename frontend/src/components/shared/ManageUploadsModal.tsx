import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Employee, AdditionalDetails, } from "@/types";
import { toast } from "sonner";
import api from "@/api";

interface ManageUploadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;

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

export function ManageUploadsModal({ isOpen, onClose, employee }: ManageUploadsModalProps) {
  if (!employee) return null;

  const handleGrantAccess = async (field: string, label:string) => {
    try {
      await api.put('/admin/grant-reupload-access', {
        employeeId: employee._id,
        field: field,
      });
      toast.success(`Access granted for ${label} . The employee can now re-upload this document.`);
    } catch (error) {
      toast.error("Failed to grant access.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Uploads for {employee.name}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentFields.map(({ key, label }) => {
              const field = employee.additionalDetails?.[key as keyof AdditionalDetails];
              
              // **THE FIX IS HERE**: Check if the field is an object and has a 'path' property
              const isUploaded = !!(field && typeof field === 'object' && !Array.isArray(field) && 'path' in field);

              return (
                <TableRow key={key}>
                  <TableCell>{label}</TableCell>
                  <TableCell>
                    {isUploaded
                      ? <span className="text-green-600">Uploaded</span> 
                      : <span className="text-gray-500">Not Uploaded</span>}
                  </TableCell>
                  <TableCell>
                    {isUploaded && (
                      <Button size="sm" variant="outline" onClick={() => handleGrantAccess(key,label)}>
                        Grant Re-upload Access
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}