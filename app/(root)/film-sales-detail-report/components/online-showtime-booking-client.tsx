"use client";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import { getPlanScreenings } from "@/data/loaders";
import { PlanScreeningDetailProps } from "@/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { endOfDay, format, parse, startOfDay } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { default as qs, default as queryString } from "query-string";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { createColumns } from "./columns";

const FilmSalesDetailReportClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamPage = searchParams.get("page");
  const searchParamFromDate = searchParams.get("fromDate");
  const searchParamToDate = searchParams.get("toDate");
  const parsedFromDate = searchParamFromDate
    ? startOfDay(parse(searchParamFromDate, "yyyy-MM-dd", new Date()))
    : startOfDay(new Date());
  const parsedToDate = searchParamToDate
    ? endOfDay(parse(searchParamToDate, "yyyy-MM-dd", new Date()))
    : endOfDay(new Date());
  const page = searchParamPage ? parseInt(searchParamPage, 10) || 1 : 1;
  const [fromDate, setFromDate] = useState<Date | null>(parsedFromDate);
  const [toDate, setToDate] = useState<Date | null>(parsedToDate);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["plan-screenings", page, fromDate, toDate],
    queryFn: () =>
      getPlanScreenings(
        qs.stringify({
          page,
          pageSize: 100,
          filter: JSON.stringify({
            projectDate: { between: [fromDate, toDate] },
          }),
        })
      ),
    enabled: false,
  });

  const changeSellOnline = useMutation({
    mutationFn: async (item: PlanScreeningDetailProps) => {
      const response = await fetch("/api/change-sell-online", {
        method: "POST",
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast.success("Cập nhật trạng thái bán online thành công");
    },
    onError: (error) => {
      console.error("Update plan screening error:", error);
      toast.error("Cập nhật trạng thái bán online thất bại");
    },
  });

  const onChangeSellOnline = useCallback(
    (item: PlanScreeningDetailProps) => {
      changeSellOnline.mutate({
        ...item,
        isOnlineSelling: item.isOnlineSelling === 1 ? 0 : 1,
      });
    },
    [changeSellOnline]
  );

  const columns = useMemo(
    () => createColumns({ onChangeSellOnline: onChangeSellOnline, page }),
    [onChangeSellOnline, page]
  );

  const handleFilter = useCallback(() => {
    const current = queryString.parse(searchParams.toString());
    const query = {
      ...current,
      fromDate: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
      toDate: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
      page: 1,
    };
    const url = queryString.stringifyUrl({ url: window.location.href, query });
    router.push(url);
    refetch();
  }, [refetch, fromDate, toDate, searchParams, router]);

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
          onClick={handleFilter}
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
    </>
  );
};

export default FilmSalesDetailReportClient;
