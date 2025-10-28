"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddUserForm from "./add-user-form";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserDialog = ({open, onOpenChange}: UserDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[876px]">
        <DialogHeader className="border-b">
          <DialogTitle>Thêm mới người dùng</DialogTitle>
        </DialogHeader>
        <div>
          <AddUserForm />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit">Xác nhận</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
