import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="mt-15 mx-5">
      <CardContent className="p-6 flex flex-col items-center text-center m-1">
        <Avatar className="h-16 w-16 mb-2">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <p className="font-semibold">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
        <Badge className="mt-2">{user.role}</Badge>
        <Button
          variant="link"
          className="mt-2 p-0 h-auto"
          onClick={() => navigate(`/details/${user.id}`)}
        >
          Additional Details
        </Button>
      </CardContent>
    </Card>
  );
}