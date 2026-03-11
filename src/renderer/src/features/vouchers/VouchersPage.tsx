import { useVouchers } from "@renderer/hooks/vouchers/useVouchers";
import { formatNumber } from "@renderer/lib/utils";
import { BatchProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Table } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Link } from "react-router";

const VouchersPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(
    () => ({
      url: "/api/v1/Voucher/available-vouchers",
      method: "POST",
      data: {
        pageIndex: current,
        pageSize: pageSize,
        movieVersion: 1,
        salesChannel: 2
      }
    }),
    [current, pageSize]
  );

  const { data: vouchers, isFetching } = useVouchers(params);

  const columns: TableProps<BatchProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Chiến dịch voucher",
      key: "batchName",
      dataIndex: "batchName"
    },
    {
      title: "Giá trị",
      key: "discountValue",
      dataIndex: "discountValue"
    },
    {
      title: "Loại",
      key: "valueTypeName",
      dataIndex: "valueTypeName"
    },
    {
      title: "Bắt đầu từ",
      key: "startAt",
      dataIndex: "startAt",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY")
    },
    {
      title: "Kết thúc",
      key: "endAt",
      dataIndex: "endAt",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY")
    }
  ];

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
              title: "Quản lý danh sách"
            },
            {
              title: "Danh sách chương trình khuyến mãi"
            }
          ]}
        />
      </div>

      <Table
        rowKey={(record) => record.batchId}
        dataSource={vouchers?.data?.items || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: vouchers?.data.totalItems || 0,
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

export default VouchersPage;
