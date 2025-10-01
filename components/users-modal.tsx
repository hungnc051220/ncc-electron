"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "./ui/button";
import Filter from "./users/filter";
import { DataTable } from "./users/data-table";
import { columns } from "./users/columns";
import AddUser from "./users/add-user";

interface UsersModalProps {
  open: boolean;
  onOpenChange: (newOpen: boolean) => void;
}

const data = [
  {
    id: "728ed52f",
    amount: 100,
    status: "pending" as const,
    email: "m@example.com",
  },
  {
    id: "728ed52f",
    amount: 100,
    status: "pending" as const,
    email: "m@example.com",
  },
  {
    id: "728ed52f",
    amount: 100,
    status: "pending" as const,
    email: "m@example.com",
  },
  {
    id: "728ed52f",
    amount: 100,
    status: "pending" as const,
    email: "m@example.com",
  },
  {
    id: "728ed52f",
    amount: 100,
    status: "pending" as const,
    email: "m@example.com",
  },
];

const UsersModal = ({ open, onOpenChange }: UsersModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[876px]">
        <DialogHeader className="border-b">
          <DialogTitle>Quản lý người dùng</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-5">
          <div className="space-y-5 px-6">
            <Filter />
            <DataTable columns={columns} data={data} />
          </div>
          <AddUser />
        </div>
        <DialogFooter>
          <Button variant="outline" type="button">
            Xóa
          </Button>
          <Button variant="outline" type="button">
            Thêm
          </Button>
          <Button type="submit">Ghi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsersModal;
