"use client";

import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const ResetPasswordDialog = ({
  children,
  onReset,
}: {
  children: React.ReactNode;
  onReset: () => void;
}) => {
  const router = useRouter();

  const handleOpenChange = () => router.back();

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[876px]">
        <DialogHeader className="border-b">
          <DialogTitle>Đặt lại mật khẩu</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter className="flex justify-between items-center">
          <Button onClick={onReset}>Đặt lại mật khẩu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
