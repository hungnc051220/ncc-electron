"use client";

import { getHolidays } from "@/data/loaders";
import { formatNumber } from "@/lib/utils";
import { HolidayProps } from "@/types";
import { MoreOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps, TabsProps } from "antd";
import { Breadcrumb, Button, DatePicker, Dropdown, Table, Tabs } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useState } from "react";
import DeleteShowtimeSlotDialog from "./delete-holiday-dialog";
import HolidayDialog from "./holiday-dialog";

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Ngày thường",
  },
  {
    key: "2",
    label: "Ngày lễ",
  },
];

const actionItems = [{ key: "1", label: <p className="text-red-500">Xóa</p> }];

const formatWeekday = (date: string) => {
  const text = dayjs(date).format("dddd");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const HolidaysClient = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HolidayProps | null>(null);
  const [activeKey, setActiveKey] = useState("1");
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [year, setYear] = useState<Dayjs>(dayjs());

  const { data: holidays, isFetching } = useQuery({
    queryKey: ["holidays", { current, pageSize, activeKey, year }],
    queryFn: () => {
      return getHolidays({
        page: current,
        pageSize,
        dateTypeId: Number(activeKey),
        year: year.year().toString(),
      });
    },
    placeholderData: keepPreviousData,
  });

  const handleDelete = useCallback((item: HolidayProps) => {
    setEditingItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingItem(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setEditingItem(null);
    }
  }, []);

  const columns: TableProps<HolidayProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * 100 + index + 1,
      width: 50,
      fixed: "left",
    },
    {
      title: "Ngày",
      key: "dateValue",
      dataIndex: "dateValue",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Thứ",
      key: "dateValue",
      dataIndex: "dateValue",
      render: (value: string) => formatWeekday(value),
    },
    {
      title: "Loại ngày",
      key: "dateTypeId",
      dataIndex: "dateTypeId",
      render: (value: number) => (value === 1 ? "Ngày thường" : "Ngày lễ"),
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
                handleDelete(record);
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
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: "Trang chủ",
              href: "/",
            },
            {
              title: "Quản lý danh sách",
            },
            {
              title: "Danh sách ngày lễ",
            },
          ]}
        />

        <div className="flex gap-2 items-center">
          <DatePicker
            picker="year"
            defaultValue={year}
            onChange={(date) => setYear(date!)}
            allowClear={false}
          />
          <Button type="primary" onClick={() => setDialogOpen(true)}>
            Cập nhật lại ngày
          </Button>
        </div>
      </div>

      <Tabs
        defaultActiveKey="ALL"
        activeKey={activeKey}
        onChange={(newActiveKey) => {
          setActiveKey(newActiveKey);
          setCurrent(1);
        }}
        items={items}
      />

      <Table
        rowKey={(record) => record.dateValue}
        dataSource={holidays?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 290px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: holidays?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`,
          hideOnSinglePage: true,
        }}
      />

      {dialogOpen && (
        <HolidayDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          year={year.year()}
          dateTypeId={Number(activeKey)}
        />
      )}

      {deleteDialogOpen && editingItem && (
        <DeleteShowtimeSlotDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={editingItem.dateValue}
          date={editingItem.dateValue}
        />
      )}
    </div>
  );
};

export default HolidaysClient;
