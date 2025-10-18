import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Employee } from "@/types";
import { Loader2 } from "lucide-react";

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  employee: Employee | null;
  viewMode?: boolean;
  isHr?: boolean;
  isSubmitting?: boolean;
}

export function EmployeeModal({ isOpen, onClose, onSubmit, employee, viewMode = false,isSubmitting = false }: EmployeeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Employee");
  const [file, setFile] = useState<File | null>(null);
  const [baseSalary, setBaseSalary] = useState<number | ''>('');

  const isEditMode = employee !== null;

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email);
      setRole(employee.role);
      setPassword('');
      setBaseSalary(employee.baseSalary || '');
      setFile(null);
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('Employee');
      setFile(null);
      setBaseSalary('');
    }
  }, [employee, isOpen]);

  const handleSubmit = () => {
    if (!name || !email || (!password && !isEditMode)) {
      toast.error("Please fill in Name, Email, and Password.");
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('role', role);

    if (password) {
      formData.append('password', password);
    }
    if (file) {
      formData.append('file', file);
    }
    formData.append('baseSalary', String(baseSalary));
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{viewMode ? 'Employee Details' : (isEditMode ? "Update Employee" : "Add New Employee")}</DialogTitle>
        </DialogHeader>

        {viewMode && employee ? (
          // --- VIEW ONLY LAYOUT ---
          <div className="grid gap-3 py-4 text-sm">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right font-semibold">Name : </Label>
              <p className="col-span-2 text-muted-foreground">{employee.name}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right font-semibold">Email : </Label>
              <p className="col-span-2 text-muted-foreground">{employee.email}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right font-semibold">Role : </Label>
              <p className="col-span-2 text-muted-foreground">{employee.role}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right font-semibold">Base Salary (Monthly):</Label>
              <p className="col-span-2 text-muted-foreground">{employee.baseSalary}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label className="text-right font-semibold">File : </Label>
              <p className="col-span-2 text-muted-foreground">
                {employee.filePath ? (
                  <a
                    href={employee.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {employee.fileName || 'View File'}
                  </a>
                ) : (
                  'No file uploaded.'
                )}
              </p>
            </div>
            <Button onClick={onClose} className="mt-4 w-full">Close</Button>
          </div>
        ) : (
          // --- EDIT / ADD FORM ---
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEditMode ? "Leave blank to keep unchanged" : "Enter a secure password"} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded bg-background">
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
                <option value="HR">HR</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="baseSalary">Base Salary (Monthly)</Label>
              <Input id="baseSalary" type="number" value={baseSalary} onChange={(e) => setBaseSalary(Number(e.target.value))} />
            </div>
           <div className="grid gap-2">
              <Label htmlFor="file">Employee File (Optional)</Label>
              <Input id="file" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} disabled={isSubmitting} />
              {isEditMode && employee?.filePath && (
                // ✅ 3. Make the "Current File" text a clickable link
                <a 
                  href={employee.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm mt-2 text-blue-600 hover:underline"
                >
                  Current File: {employee.fileName || employee.filePath.split(/[\\/]/).pop()}
                </a>
              )}
            </div>
            
            {/* ✅ 4. Update button to show loading state */}
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? "Save Changes" : "Save Employee"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

