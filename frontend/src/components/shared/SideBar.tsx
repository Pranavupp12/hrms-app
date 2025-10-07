import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { UserProfileCard } from "./UserProfileCard";

interface SidebarProps {
  tabs: string[];
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  className?: string;
}

export function Sidebar({ tabs, className, user }: SidebarProps) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-4 px-3">
            {/* You can replace this with your actual logo */}
            <img 
              src="/images/DashMediaLogo.png" 
              alt="Company Logo" 
              className="h-12 w-auto" // Adjust size as needed
            />
          </div>
          <div className="my-10">
            <UserProfileCard user={user} />
          </div>
      
          <TabsList className="flex flex-col items-start justify-start h-auto bg-transparent py-2">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab} 
                value={tab.toLowerCase().replace(/\s+/g, '-')}
                className="w-full justify-start "
              >
                <span className="py-1">
                      {tab}
                </span>
              
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
    </div>
  );
}