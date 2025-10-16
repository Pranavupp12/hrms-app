import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <Card className="mt-auto border-none shadow-none bg-indigo-200">
      <CardContent className="p-4 flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start text-left">
          <p className="font-semibold text-base">{user.name}</p>
          <p className="text-sm text-muted-foreground pt-0.5">{user.email}</p>
          <Badge className="mt-2 ">{user.role}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}