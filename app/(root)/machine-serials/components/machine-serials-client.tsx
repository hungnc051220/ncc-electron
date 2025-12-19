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
import { ApiResponse, MachineSerialProps } from "@/types";
import { useMemo, useState } from "react";
import { createColumns } from "./columns";
import Filter from "./filter";

interface MachineSerialsClientProps {
  data: ApiResponse<MachineSerialProps>;
  page: number;
}

const MachineSerialsClient = ({ data, page }: MachineSerialsClientProps) => {
  const [isSearching, setIsSearching] = useState(false);

  const columns = useMemo(() => createColumns({ page }), [page]);

  return (
    <div className="space-y-3 mt-4 px-4">
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
                <BreadcrumbPage className="font-bold">Danh sách seri các máy bán vé</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <Filter onSearchingChange={setIsSearching} />
      <DataTable
        columns={columns}
        data={data.data || []}
        total={data.total}
        loading={isSearching}
        className="max-h-[calc(100vh-240px)]"
      />
    </div>
  );
};

export default MachineSerialsClient;
