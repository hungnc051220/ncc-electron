"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { User } from "@/types";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import Filter from "./filter";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface UsersClientProps {
  initialData: User[];
}

const UsersClient = ({ initialData }: UsersClientProps) => {
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

        <Button>
          <PlusIcon className="size-6" />
          Thêm người dùng
        </Button>
      </div>

      <Filter />
      <DataTable columns={columns} data={initialData} />
    </div>
  );
};

export default UsersClient;
