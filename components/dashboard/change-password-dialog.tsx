"use client";

import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const SubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      form="change-password-form"
      disabled={pending}
      className="flex items-center justify-center w-[96px] h-[40px] px-4 py-2 border border-[#464FB4] rounded-[8.4px] bg-[#464FB4] text-white text-sm font-medium disabled:opacity-50"
      variant="outline"
    >
      {pending ? "Đang..." : "Cập nhật"}
    </Button>
  );
};

const ChangePasswordDialog = ({
  children,
  onShowReset,
  view,
}: {
  children: React.ReactNode;
  onShowReset: () => void;
  view: "change" | "reset";
}) => {
  const router = useRouter();

  const handleOpenChange = () => router.back();

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      {view === "change" ? (
        <DialogContent className="gap-4 w-[476px] min-h-[405.8px] text-[20px] border border-[#EAECF0] rounded-[12px] flex flex-col">
          <DialogHeader className="flex flex-row justify-between w-[476px] h-[28px] py-6 px-[20px]">
            <DialogTitle>Thay đổi mật khẩu</DialogTitle>
          </DialogHeader>
          {children}
           <DialogFooter className="flex justify-between items-center">
          
          <Button
            type="button"
            className="flex items-center justify-between w-[144px] h-[40px] px-[16px] py-[8px] border border-[#595D62] rounded-[8.4px] bg-white text-sm font-medium text-black hover:bg-[#f0f0f0]"
            onClick={onShowReset}
          >
            Đặt lại mật khẩu
          </Button>
          <SubmitButton />
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent className="pt-[8px] pb-[8px] gap-4 w-[476px] min-h-[300px] border border-[#EAECF0] rounded-[12px] flex flex-col">
          <DialogHeader className="flex flex-row justify-between w-[476px] h-[28px] px-[20px]">
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          </DialogHeader>
          {children}
          <DialogFooter className="flex justify-end">
          <Button type="button">Xác thực</Button>
        </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default ChangePasswordDialog;