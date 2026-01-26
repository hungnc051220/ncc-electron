"use client";

import { Breadcrumb, Table } from "antd";
import { useState } from "react";
import Filter from "./filter";
import type { TableProps, PaginationProps } from "antd";
import { MachineSerialProps } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { filterEmptyValues, formatNumber } from "@/lib/utils";
import { getMachineSerials } from "@/data/loaders";

export interface ValuesProps {
  year?: number;
}

const MachineSerialsClient = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const columns: TableProps<MachineSerialProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left",
    },
    {
      title: "Năm",
      key: "activeYear",
      dataIndex: "activeYear",
    },
    {
      title: "Ký hiệu",
      key: "shortName",
      dataIndex: "shortName",
    },
    {
      title: "Vé đã in",
      key: "printTimes",
      dataIndex: "printTimes",
      render: (_, { printTimes }) => formatNumber(printTimes),
    },
    {
      title: "Vé đã hủy",
      key: "cancelTimes",
      dataIndex: "cancelTimes",
      render: (_, { cancelTimes }) => formatNumber(cancelTimes),
    },
  ];

  const { data: machineSerials, isFetching } = useQuery({
    queryKey: ["machine-serials", { current, pageSize, filterValues }],
    queryFn: () => {
      const filtered = filterEmptyValues(
        filterValues as Record<string, unknown>,
      );
      return getMachineSerials({ page: current, pageSize, ...filtered });
    },
    placeholderData: keepPreviousData,
  });

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps['onShowSizeChange'] = (current, pageSize) => {
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
              title: "Hệ thống",
            },
            {
              title: "Danh sách seri các máy bán vé",
            },
          ]}
        />
        <Filter
          isFetching={isFetching}
          onSearch={onSearch}
          setCurrent={setCurrent}
        />
      </div>

      <Table
        dataSource={machineSerials?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 230px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: machineSerials?.total || 0,
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

export default MachineSerialsClient;
