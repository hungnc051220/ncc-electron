"use client";

import { useCancelTickets } from "@renderer/hooks/useCancelTickets";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { CancellationTicketProps } from "@renderer/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Table } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import Filter from "./components/Filter";

export interface ValuesProps {
  filmId?: number;
  userId?: number;
  dateRange?: [string, string];
}

const CancellationTicketsPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").toISOString();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").toISOString();
    }

    return {
      current,
      pageSize,
      ...filtered
    };
  }, [current, pageSize, filterValues]);

  const { data: cancellationTickets, isFetching } = useCancelTickets(params);

  const columns: TableProps<CancellationTicketProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Ngày hủy",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (value: string) => dayjs(value).utc().format("DD/MM/YYYY"),
      width: 100
    },
    {
      title: "Phim",
      key: "filmName",
      dataIndex: "filmName",
      width: 500
    },
    {
      title: "Phòng",
      key: "roomName",
      dataIndex: "roomName"
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (value: string) => dayjs(value, "YYYY-MM-DD").utc().format("DD/MM/YYYY")
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (value: string) => dayjs(value).utc().format("HH:mm")
    },
    {
      title: "Số vé",
      key: "quantity",
      dataIndex: "quantity"
    },
    {
      title: "Vị trí ghế",
      key: "cancelChairValue",
      dataIndex: "cancelChairValue",
      render: (_, record) =>
        [record.cancelChairValueF1, record.cancelChairValueF2, record.cancelChairValueF3]
          .filter((i) => i.trim() !== "")
          .join(", ")
    },
    {
      title: "Người hủy",
      key: "userName",
      dataIndex: "userName"
    },
    {
      title: "Lý do hủy",
      key: "reason",
      dataIndex: "reason"
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
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
              href: "/"
            },
            {
              title: "Bán vé"
            },
            {
              title: "Quản lý vé hủy"
            }
          ]}
        />
        <div className="flex items-center gap-2">
          <Filter filterValues={filterValues} onSearch={onSearch} setCurrent={setCurrent} />
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={cancellationTickets?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: cancellationTickets?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />
    </div>
  );
};

export default CancellationTicketsPage;
