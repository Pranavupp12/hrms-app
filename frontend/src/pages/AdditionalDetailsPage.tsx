import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Employee, AdditionalDetails, FileData } from "@/types";
import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "../api";
import { Loader2 } from "lucide-react";
import { socket } from "../socket";

// This helper component is now updated to handle both old and new data structures
const FileInputDisplay = ({
  label,
  name,
  file,
  onChange,
  disabled
}: {
  label: string;
  name: string;
  file?: FileData | string; // Can be a string (old) or FileData object (new)
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) => {
  const getFileInfo = () => {
    if (!file) {
      return { name: null, url: null };
    }
    // Handles new Cloudinary data format ({ path: '...', originalName: '...' })
    if (typeof file === 'object' && file.path) {
      return { name: file.originalName, url: file.path };
    }
    // Handles old data format (just a string, which might be a URL)
    if (typeof file === 'string') {
      return { name: file.split(/[\\/]/).pop(), url: file };
    }
    return { name: null, url: null };
  };

  const { name: fileName, url: fileUrl } = getFileInfo();

  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="file" onChange={onChange} disabled={disabled} />
      {fileName && fileUrl ? (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm mt-2 text-blue-600 hover:underline cursor-pointer"
        >
          Current file: {fileName}
        </a>
      ) : (
        fileName && (
          <div className="text-sm mt-2 text-muted-foreground">
            Current file: {fileName}
          </div>
        )
      )}
    </div>
  );
};

export function AdditionalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [personalEmail, setPersonalEmail] = useState('');
  const [files, setFiles] = useState<{ [key: string]: File | null }>({});
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  // ✅ 2. Get the user from localStorage to get their ID
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/details/${id}`);
      setEmployee(res.data);
      setPersonalEmail(res.data.additionalDetails?.personalEmail || '');
    } catch (error) {
      toast.error("Failed to fetch employee details.");
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Add this new useEffect to listen for socket events
  useEffect(() => {
    // Ensure we have a user ID to join a room
    if (!user.id) return;

    // Join the private room for this user
    socket.emit('join_room', user.id);

    // Define the event handler
    const handleReuploadAccess = (data: { field: string, message: string }) => {
      toast.info(data.message);
      
      // This is the key:
      // Re-fetch all details from the server to get the new
      // reuploadAccess array, which will unlock the input.
      fetchDetails(); 
    };

    // Start listening
    socket.on('reupload_access_granted', handleReuploadAccess);

    // Cleanup listener when the component unmounts
    return () => {
      socket.off('reupload_access_granted', handleReuploadAccess);
    };
  }, [user.id]); // Dependency on user.id



  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files: inputFiles } = e.target;
    if (inputFiles && inputFiles.length > 0) {
      setFiles(prev => ({ ...prev, [name]: inputFiles[0] }));
    }
  };

  

  const handleSubmit = async () => {

    // Prevent API call if nothing has changed
    if (Object.keys(files).length === 0 && personalEmail === (employee?.additionalDetails?.personalEmail || '')) {
      toast.info("No new information to save.");
      return;
    }

    setIsUploading(true); // ✅ 3. Set loading to true
    const loadingToastId = toast.loading("Uploading files and saving details...");

    const formData = new FormData();
    formData.append('personalEmail', personalEmail);

    for (const key in files) {
      if (files[key]) {
        formData.append(key, files[key] as File);
      }
    }

    try {
      await api.put(`/details/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success("Details updated successfully!", { id: loadingToastId });
      setFiles({});
      fetchDetails(); // Refetch to update the UI
    } catch (error) {
      toast.error("Failed to update details.", { id: loadingToastId });
    } finally {
      setIsUploading(false); // ✅ 4. Set loading to false in the 'finally' block
      toast.dismiss(); // Dismiss the loading toast
    }

  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  const details: Partial<AdditionalDetails> = employee.additionalDetails || {};
  const reuploadAccess = details.reuploadAccess || [];

  return (
    <div className="p-8 space-y-6 bg-blue-50">
      <Button onClick={() => navigate(-1)}>&larr; Back to Dashboard</Button>
      <Card>
        <CardHeader><CardTitle>User Profile</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label>Name:</Label><p>{employee.name}</p></div>
          <div><Label>Email:</Label><p>{employee.email}</p></div>
          <div><Label>Role:</Label><p>{employee.role}</p></div>
          <div><Label>Employee ID:</Label><p>{employee._id}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upload Additional Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="personalEmail">Personal Email</Label>
            <Input
              id="personalEmail"
              value={personalEmail}
              onChange={e => setPersonalEmail(e.target.value)}
              disabled={!!details.personalEmail || isUploading}
            />
          </div>

          <FileInputDisplay
            label="10th Marksheet"
            name="tenthMarksheet"
            file={details.tenthMarksheet}
            onChange={handleFileChange}
            disabled={!!details.tenthMarksheet && !reuploadAccess.includes('tenthMarksheet')}
          />
          <FileInputDisplay
            label="12th Marksheet"
            name="twelfthMarksheet"
            file={details.twelfthMarksheet}
            onChange={handleFileChange}
            disabled={!!details.twelfthMarksheet && !reuploadAccess.includes('twelfthMarksheet')}
          />
          <FileInputDisplay
            label="Resume"
            name="resume"
            file={details.resume}
            onChange={handleFileChange}
            disabled={!!details.resume && !reuploadAccess.includes('resume')}
          />
          <FileInputDisplay
            label="PAN Card"
            name="panCardFront"
            file={details.panCardFront}
            onChange={handleFileChange}
            disabled={!!details.panCardFront && !reuploadAccess.includes('panCardFront')}
          />
          <FileInputDisplay
            label="Aadhaar Card (Front)"
            name="aadharCardFront"
            file={details.aadharCardFront}
            onChange={handleFileChange}
            disabled={!!details.aadharCardFront && !reuploadAccess.includes('aadharCardFront')}
          />
          <FileInputDisplay
            label="Aadhaar Card (Back)"
            name="aadharCardBack"
            file={details.aadharCardBack}
            onChange={handleFileChange}
            disabled={!!details.aadharCardBack && !reuploadAccess.includes('aadharCardBack')}
          />
          <FileInputDisplay
            label="Cancelled Cheque"
            name="cancelledCheque"
            file={details.cancelledCheque}
            onChange={handleFileChange}
            disabled={!!details.cancelledCheque && !reuploadAccess.includes('cancelledCheque')}
          />

          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Save Additional Information'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}