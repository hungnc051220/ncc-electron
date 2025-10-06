"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import AddUserForm from "./add-user-form";

const AddUserModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          Thêm người dùng
        </Button>
      </DialogTrigger>
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

export default AddUserModal;
