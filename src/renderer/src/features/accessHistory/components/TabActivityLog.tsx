import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { useAuditLog } from "@renderer/hooks/useAuditLog";
import { formatNumber } from "@renderer/lib/utils";
import { AuditLogProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type { AccessHistoryFilterValues } from "./Filter";
import { dataTypes } from "./accessHistory.constants";

interface TabActivityLogProps {
  filterValues: AccessHistoryFilterValues;
}

const TabActivityLog = ({ filterValues }: TabActivityLogProps) => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(() => {
    return {
      current,
      pageSize,
      userId: filterValues.userId,
      model: filterValues.model,
      fromDate: filterValues.dateRange?.[0],
      toDate: filterValues.dateRange?.[1]
    };
  }, [current, pageSize, filterValues]);

  const { data, isFetching: isFetchingData } = useAuditLog(params);

  const columns: TableProps<AuditLogProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      width: 50,
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1
    },
    {
      title: "Dữ liệu",
      dataIndex: "model",
      key: "model",
      render: (model) => dataTypes.find((item) => item.value === model)?.label || model
    },
    {
      title: "Người cập nhật",
      dataIndex: "username",
      key: "username"
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (_, { timestamp }) => dayjs(timestamp).format("DD/MM/YYYY HH:mm")
    }
  ];

  const onChange: PaginationProps["onChange"] = (page) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AutoHeightTable
        dataSource={data?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetchingData}
        pagination={{
          current,
          onChange,
          total: data?.total || 0,
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

export default TabActivityLog;
