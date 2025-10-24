"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { columns } from "@/components/users/columns";
import { DataTable } from "@/components/users/data-table";
import Filter from "@/components/users/filter";
import { User } from "@/types";
import { useState } from "react";
import { Button } from "../ui/button";
import { PlusIcon } from "lucide-react";
import UserDialog from "./user-dialog";

interface UsersClientProps {
  initialData: User[];
}

const UsersClient = ({ initialData }: UsersClientProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSave = async (user: User) => {
    console.log(user);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Hệ thống</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lý người dùng</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h3 className="font-bold text-2xl mt-1">Quản lý người dùng</h3>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusIcon />
          Thêm người dùng
        </Button>
      </div>

      <Filter />
      <DataTable columns={columns} data={initialData} />
      <UserDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
};

export default UsersClient;
