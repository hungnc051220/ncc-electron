"use client";

import { DataTable } from "@/components/data-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ApiResponse, UserProps } from "@/types";
import { useMemo, useState } from "react";
import { createColumns } from "./columns";
import Filter from "./filter";

interface MachineSerialsClientProps {
  data: ApiResponse<UserProps>;
  page: number;
}

const MachineSerialsClient = ({ data, page }: MachineSerialsClientProps) => {
  const [isSearching, setIsSearching] = useState(false);

  const columns = useMemo(() => createColumns({ page }), [page]);

  return (
    <div className="space-y-8 mt-4 xl:mt-10">
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
                <BreadcrumbPage>Xem Seri máy</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h3 className="font-bold text-2xl mt-1">
            Danh sách seri các máy bán vé
          </h3>
        </div>
      </div>

      <Filter onSearchingChange={setIsSearching} />
      <DataTable
        columns={columns}
        data={data.data || []}
        total={data.total}
        loading={isSearching}
      />
    </div>
  );
};

export default MachineSerialsClient;
