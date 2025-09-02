import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

// Define the shape of the data this modal will submit
// This now includes the password field to match the backend requirement
interface NewEmployeeData {
  name: string;
  email: string;
  password: string;
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
  const [password, setPassword] = useState(""); // State for the password

  const handleSubmit = () => {
    // Basic validation
    if (!name || !email || !password) {
      toast.error("Please fill out all fields.");
      return;
    }

    // Call the onSubmit prop passed from the parent component
    onSubmit({ name, email, password });
    
    // Close the modal
    setIsOpen(false);

    // Reset the form fields for the next time
    setName("");
    setEmail("");
    setPassword("");
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
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a secure password"/>
          </div>
          <Button onClick={handleSubmit}>Save Employee</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
