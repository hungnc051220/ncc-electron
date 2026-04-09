import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useCancelTickets } from "@renderer/hooks/useCancelTickets";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { CancellationTicketProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
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
      title: "Thời gian hủy",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY"),
      width: 150
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "order",
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "order",
      render: (order) => order?.customerPhone
    },
    {
      title: "Email",
      key: "customerEmail",
      dataIndex: "order",
      render: (order) => order?.customerEmail
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
      render: (value: string) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY")
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (value: string) => dayjs(value).format("HH:mm")
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
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={<Filter filterValues={filterValues} onSearch={onSearch} setCurrent={setCurrent} />}
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={cancellationTickets?.data || []}
        columns={columns}
        bordered
        size="small"
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
