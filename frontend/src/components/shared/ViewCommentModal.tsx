
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ViewCommentModalProps {
  children: React.ReactNode;
  reason: string;
}

export function ViewCommentModal({ children, reason }: ViewCommentModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin's Comment</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">{reason}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}