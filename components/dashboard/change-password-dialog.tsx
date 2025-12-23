"use client";

import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type ChangePasswordDialogProps = {
  children: React.ReactNode;
  pending?: boolean;
};

const ChangePasswordDialog = ({
  children,
  pending = false,
}: ChangePasswordDialogProps) => {
  const router = useRouter();

  const handleOpenChange = () => router.back();

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[476px]">
        <DialogHeader className="border-b">
          <DialogTitle>Thay đổi mật khẩu</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="submit" form="change-password-form" disabled={pending}>
            Xác nhận
          </Button>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Đóng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
