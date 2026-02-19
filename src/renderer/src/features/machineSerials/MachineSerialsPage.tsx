import { useMachineSerials } from "@renderer/hooks/useMachineSerials";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { MachineSerialProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Table } from "antd";
import { useMemo, useState } from "react";
import Filter from "./components/Filter";
import { Link } from "react-router";

export interface ValuesProps {
  year?: number;
}

const MachineSerialsPage = () => {
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
      fixed: "left"
    },
    {
      title: "Năm",
      key: "activeYear",
      dataIndex: "activeYear"
    },
    {
      title: "Ký hiệu",
      key: "shortName",
      dataIndex: "shortName"
    },
    {
      title: "Vé đã in",
      key: "printTimes",
      dataIndex: "printTimes",
      render: (_, { printTimes }) => formatNumber(printTimes)
    },
    {
      title: "Vé đã hủy",
      key: "cancelTimes",
      dataIndex: "cancelTimes",
      render: (_, { cancelTimes }) => formatNumber(cancelTimes)
    }
  ];

  const params = useMemo(
    () => ({
      current,
      pageSize,
      ...filterEmptyValues(filterValues)
    }),
    [current, pageSize, filterValues]
  );

  const { data: machineSerials, isFetching } = useMachineSerials(params);

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
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Hệ thống"
            },
            {
              title: "Danh sách seri các máy bán vé"
            }
          ]}
        />
        <Filter isFetching={isFetching} onSearch={onSearch} setCurrent={setCurrent} />
      </div>

      <Table
        rowKey="id"
        dataSource={machineSerials?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
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
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />
    </div>
  );
};

export default MachineSerialsPage;
