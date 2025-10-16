import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { UserProfileCard } from "./UserProfileCard";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { LogOut , X } from "lucide-react"; // Import the LogOut icon
import { toast } from "sonner"; // Import toast for notifications

interface SidebarProps {
  tabs: {
    name: string;
    icon: LucideIcon;
  }[];
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  className?: string;
}

export function Sidebar({ tabs, user, className, }: SidebarProps) {
  const navigate = useNavigate();

  // Logout logic is now inside the sidebar
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('loginNotificationShown');
    toast.success("You have been logged out.");
    navigate('/login');
  };

  return (
    <div className={cn("flex flex-col h-full bg-indigo-100", className)}>
      {/* Top Section: Logo, Tabs, Additional Details */}
      <div className="px-3 py-4">
        <div className="mb-4 px-2">
          <img 
            src="/images/DashMediaLogo.png" 
            alt="Company Logo" 
            className="h-14 w-auto"
          />
        </div>
        <Separator className="bg-indigo-300" />
        <TabsList className="flex flex-col items-start justify-start h-auto bg-transparent pt-4 pb-4">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.name} 
              value={tab.name.toLowerCase().replace(/\s+/g, '-')}
              className="w-full justify-start font-semibold text-gray-600 hover:text-indigo-800 data-[state=active]:bg-indigo-200 data-[state=active]:text-indigo-800"
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <Separator className="bg-indigo-300" />
        <Button
          variant="ghost"
          className="w-full justify-start font-semibold mt-4 text-gray-600 hover:text-indigo-800"
          onClick={() => navigate(`/details/${user.id}`)}
        >
          Additional Details
        </Button>
      </div>

      {/* Bottom Section: Profile Card & Logout */}
      <div className="mt-auto p-3">
        <UserProfileCard user={user} />
        <Separator className="my-4 bg-indigo-300" />
        <Button
          variant="ghost"
          className="w-full justify-start font-semibold text-red-600 hover:bg-red-100 hover:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}