import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useMachineSerials } from "@renderer/hooks/useMachineSerials";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { MachineSerialProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import Filter from "./components/Filter";

export interface ValuesProps {
  year?: number;
}

const MachineSerialsPage = () => {
  const currentYear = dayjs().year();
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({ year: currentYear });

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
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <Filter
            isFetching={isFetching}
            onSearch={onSearch}
            setCurrent={setCurrent}
            year={filterValues.year}
          />
        }
      />

      <AutoHeightTable
        rowKey="id"
        dataSource={machineSerials?.data || []}
        columns={columns}
        bordered
        size="small"
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
