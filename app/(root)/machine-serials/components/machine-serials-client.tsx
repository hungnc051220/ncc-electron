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
import { columns } from "../components/columns";
import { DataTable } from "./data-table";
import Filter from "./filter";

interface MachineSerialsClientProps {
  initialData: User[];
}

const MachineSerialsClient = ({ initialData }: MachineSerialsClientProps) => {
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
                <BreadcrumbPage>Danh sách seri các máy bán vé</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h3 className="font-bold text-2xl mt-1">
            Danh sách seri các máy bán vé
          </h3>
        </div>
      </div>

      <Filter />
      <DataTable columns={columns} data={initialData} />
    </div>
  );
};

export default MachineSerialsClient;
