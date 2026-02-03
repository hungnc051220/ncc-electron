"use client";

import { getPlanScreenings } from "@/data/loaders";
import { formatNumber } from "@/lib/utils";
import { PlanScreeningDetailProps } from "@/types";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginationProps, TableProps, TimeRangePickerProps } from "antd";
import { Breadcrumb, DatePicker, Switch, Table } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { default as qs } from "query-string";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] },
];

const OnlineShowtimeBookingClient = () => {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [fromDate, setFromDate] = useState<Dayjs | null>(
    dayjs().startOf("day"),
  );
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs().endOf("day"));

  const { data, isFetching } = useQuery({
    queryKey: ["plan-screenings", current, pageSize, fromDate, toDate],
    queryFn: () =>
      getPlanScreenings(
        qs.stringify({
          page: current,
          pageSize,
          filter: JSON.stringify({
            projectDate: {
              between: [
                fromDate?.startOf("day").format(),
                toDate?.endOf("day").format(),
              ],
            },
          }),
        }),
      ),
    placeholderData: keepPreviousData,
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
      queryClient.invalidateQueries({ queryKey: ["plan-screenings"] });
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
    [changeSellOnline],
  );

  const columns: TableProps<PlanScreeningDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left",
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (value) => dayjs(value).format("DD/MM/YYYY"),
      width: 120,
    },
    {
      title: "Ngày chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (value) => dayjs(value).format("HH:mm"),
      width: 100,
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, reccord) => reccord.filmInfo.filmName,
    },
    {
      title: "Bán online",
      key: "isSellingOnline",
      dataIndex: "isSellingOnline",
      render: (_, record) => {
        return (
          <Switch
            checked={record.isOnlineSelling === 1 ? true : false}
            onChange={() => onChangeSellOnline(record)}
            size="default"
          />
        );
      },
    },
  ];

  const onRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates) {
      setFromDate(dates[0]);
      setToDate(dates[1]);
    }
  };

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (
    current,
    pageSize,
  ) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <div className="space-y-3 mt-4 px-4">
      <Breadcrumb
        items={[
          {
            title: "Trang chủ",
            href: "/",
          },
          {
            title: "Kế hoạch chiếu phim",
          },
          {
            title: "Thiết lập bán online theo ca chiếu",
          },
        ]}
      />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 z-20">
          <RangePicker
            defaultValue={[fromDate, toDate]}
            format="DD/MM/YYYY"
            onChange={onRangeChange}
            presets={rangePresets}
            allowClear={false}
          />
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={data?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 260px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: data?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`,
        }}
      />
    </div>
  );
};

export default OnlineShowtimeBookingClient;
