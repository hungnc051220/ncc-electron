"use client";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import { getFilmScheduling } from "@/data/loaders";
import { PlanCinemaProps } from "@/types";
import { useQuery } from "@tanstack/react-query";
import qs from "query-string";
import { useCallback, useMemo, useState } from "react";
import { createColumns } from "./columns";
import ShowtimeScheduleDetailDialog from "./discount-settings-dialog";
import { useSearchParams } from "next/navigation";

const ShowtimeScheduleClient = () => {
  const searchParams = useSearchParams();
  const searchParamPage = searchParams.get("page");
  const page = searchParamPage ? parseInt(searchParamPage, 10) || 1 : 1;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlanCinemaProps | null>(
    null
  );
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["plan-cinema", page, fromDate, toDate],
    queryFn: () =>
      getFilmScheduling(
        qs.stringify({
          page,
          pageSize: 100,
          filter: JSON.stringify({
            status: 3,
            createdOnUtc: { between: [fromDate, toDate] },
          }),
        })
      ),
    enabled: false,
  });

  const handleViewDetail = useCallback((item: PlanCinemaProps) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const columns = useMemo(
    () => createColumns({ onViewDetail: handleViewDetail, page }),
    [handleViewDetail, page]
  );

  return (
    <>
      <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-4"></div>
        </div>
        <Button
          disabled={isFetching || !fromDate || !toDate}
          className="h-9"
          onClick={() => refetch()}
        >
          Lọc dữ liệu
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        loading={isFetching}
        className="max-h-[calc(100vh-230px)]"
      />
      {dialogOpen && (
        <ShowtimeScheduleDetailDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          selectedItem={selectedItem}
        />
      )}
    </>
  );
};

export default ShowtimeScheduleClient;
