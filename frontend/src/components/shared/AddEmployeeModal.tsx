import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

// Define the shape of the data this modal will submit
interface NewEmployeeData {
  name: string;
  email: string;
}

// Define the props for our component
interface AddEmployeeModalProps {
  onSubmit: (data: NewEmployeeData) => void;
  children: React.ReactNode;
}

export function AddEmployeeModal({ onSubmit, children }: AddEmployeeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    // Basic validation
    if (!name || !email) {
      toast.error("Please enter both name and email.");
      return;
    }

    // Call the onSubmit prop passed from the parent component
    onSubmit({ name, email });
    
    // Close the modal
    setIsOpen(false);

    // Reset the form fields for the next time
    setName("");
    setEmail("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe"/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john.doe@example.com"/>
          </div>
          <Button onClick={handleSubmit}>Save Employee</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
