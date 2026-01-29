"use client";

import { getFilmScheduling } from "@/data/loaders";
import { formatNumber } from "@/lib/utils";
import { PlanCinemaProps } from "@/types";
import { MoreOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps, TimeRangePickerProps } from "antd";
import { Breadcrumb, DatePicker, Dropdown, Table } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Check } from "lucide-react";
import qs from "query-string";
import { useCallback, useState } from "react";
import ShowtimeScheduleDetailDialog from "./showtime-schedule-detail-dialog";

const actionItems = [{ key: "1", label: "Xem chi tiết" }];

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] },
];

const ShowtimeScheduleClient = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlanCinemaProps | null>(
    null,
  );
  const [fromDate, setFromDate] = useState<Dayjs | null>(
    dayjs().startOf("day"),
  );
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs().endOf("day"));

  const { data, isFetching } = useQuery({
    queryKey: ["plan-cinema", current, pageSize, fromDate, toDate],
    queryFn: () =>
      getFilmScheduling(
        qs.stringify({
          page: current,
          pageSize,
          filter: JSON.stringify({
            status: 3,
            createdOnUtc: {
              between: [fromDate?.startOf("day"), toDate?.endOf("day")],
            },
          }),
        }),
      ),
    placeholderData: keepPreviousData,
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

  const columns: TableProps<PlanCinemaProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left",
    },
    {
      title: "Tên lịch chiếu",
      key: "name",
      dataIndex: "name",
    },
    {
      title: "Ngày lập kế hoạch",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (value) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Duyệt",
      key: "status",
      dataIndex: "status",
      render: () => <Check className="size-4 text-green-500" />,
    },
    {
      title: "",
      key: "operation",
      width: 50,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: actionItems,
            onClick: (e) => {
              if (e.key === "1") {
                handleViewDetail(record);
              }
            },
          }}
          arrow
          trigger={["click"]}
        >
          <MoreOutlined />
        </Dropdown>
      ),
      align: "center",
      fixed: "right",
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
            title: "Xem lịch chiếu phim",
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

      {dialogOpen && (
        <ShowtimeScheduleDetailDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default ShowtimeScheduleClient;
