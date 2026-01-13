"use client";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { createColumns } from "./columns";
import { endOfDay, startOfDay } from "date-fns";
import { useSearchParams } from "next/navigation";

const TabActivityLog = () => {
  const searchParams = useSearchParams();
  const currentPage = Math.max(
    parseInt(searchParams.get("page") || "1", 10),
    1
  );
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());

  const {
    data,
    refetch,
    isFetching: isFetchingData,
  } = useQuery({
    queryKey: ["reports-revenue-by-staff", { fromDate, toDate }],
    queryFn: () => {
      const queryObject: Record<string, unknown> = {
        storeId: 0,
        fromDate: startOfDay(fromDate || new Date()).toISOString(),
        toDate: endOfDay(toDate || new Date()).toISOString(),
        reportType: "STAFF",
      };

      return fetch("/api/reports-revenue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryObject),
      }).then((res) => res.json());
    },
    enabled: false,
  });

  const columns = useMemo(() => createColumns(), []);

  return (
    <div>
      <div className="flex items-center gap-x-4 gap-y-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 z-20">
          <p className="text-sm whitespace-nowrap">Từ ngày</p>
          <CustomDatePicker
            selectedDate={fromDate}
            onChangeDate={(date) => {
              setFromDate(date);
              setToDate(null);
            }}
            className="w-[150px]"
            selectsStart
            startDate={fromDate}
            endDate={toDate}
            isClearable={false}
          />
        </div>

        <div className="flex items-center gap-2 z-20">
          <p className="text-sm whitespace-nowrap">Đến ngày</p>
          <CustomDatePicker
            selectedDate={toDate}
            onChangeDate={(date) => setToDate(date)}
            className="w-[150px]"
            selectsEnd
            startDate={fromDate}
            endDate={toDate}
            minDate={fromDate || undefined}
            isClearable={false}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetchingData}
        >
          Lọc dữ liệu
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data?.revenueByEmployee || []}
        total={data?.revenueByEmployee?.length || 0}
        className="max-h-[calc(100vh-300px)]"
        loading={isFetchingData}
      />
    </div>
  );
};

export default TabActivityLog;
