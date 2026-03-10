import { useCancellationReasons } from "@renderer/hooks/cancellationReasons/useCancellationReasons";
import { formatNumber } from "@renderer/lib/utils";
import { CancellationReasonProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Table } from "antd";
import { useMemo, useState } from "react";
import { Link } from "react-router";

const VouchersPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: cancellationReasons, isFetching } = useCancellationReasons(params);

  const columns: TableProps<CancellationReasonProps>["columns"] = [
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
      title: "Mã voucher",
      key: "code",
      dataIndex: "code"
    },
    {
      title: "Mã pin",
      key: "code",
      dataIndex: "code"
    },
    {
      title: "Hạng thẻ",
      key: "code",
      dataIndex: "code"
    },
    {
      title: "Giá trị",
      key: "code",
      dataIndex: "code"
    },
    {
      title: "Giá trị tối thiểu",
      key: "code",
      dataIndex: "code"
    },
    {
      title: "Lượt còn lại",
      key: "code",
      dataIndex: "code"
    },
    {
      title: "Khách hàng",
      key: "code",
      dataIndex: "code"
    },
    {
      title: "Ngày hết hạn",
      key: "code",
      dataIndex: "code"
    },
    {
      title: "Trạng thái",
      key: "code",
      dataIndex: "code"
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
        rowKey={(record) => record.id}
        dataSource={[]}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: cancellationReasons?.total || 0,
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
