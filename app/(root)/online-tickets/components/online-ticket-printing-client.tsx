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
import {
  ApiResponse,
  OrderDetailProps
} from "@/types";
import { useMemo, useState } from "react";
import { createColumns } from "./columns";

interface OnlineTicketsClientProps {
  data: ApiResponse<OrderDetailProps>;
  page: number;
}

const OnlineTicketsClient = ({
  data,
  page,
}: OnlineTicketsClientProps) => {
  const [isSearching, setIsSearching] = useState(false);

  const columns = useMemo(
    () =>
      createColumns({
        page,
      }),
    [page]
  );

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
                <BreadcrumbPage>Bán vé</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Quản lý vé online
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        loading={isSearching}
        className="max-h-[calc(100vh-200px)]"
      />
    </div>
  );
};

export default OnlineTicketsClient;
