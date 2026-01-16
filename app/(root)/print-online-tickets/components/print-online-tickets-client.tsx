"use client";

import { ApiResponse, OrderDetailProps } from "@/types";
import type { TableProps, PaginationProps } from "antd";
import { Breadcrumb, Button, Table } from "antd";
import { Check, X } from "lucide-react";
import dayjs from "dayjs";
import { formatNumber } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface PrintOnlineTicketsClientProps {
  data: ApiResponse<OrderDetailProps>;
  page: number;
}

const PrintOnlineTicketsClient = ({
  data,
  page,
}: PrintOnlineTicketsClientProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const columns: TableProps<OrderDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (page - 1) * 100 + index + 1,
      width: 50,
      fixed: "left",
    },

    {
      title: "Mã đặt vé",
      key: "barCode",
      dataIndex: "order",
      render: (order) => order.barCode,
      fixed: "left",
    },
    {
      title: "Thời gian mua",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (createdOnUtc) => dayjs(createdOnUtc).format("HH:mm DD/MM/YYYY"),
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "order",
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName]
          .filter(Boolean)
          .join(" "),
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "order",
      render: (order) => order.customerPhone,
    },
    {
      title: "Email",
      key: "customerEmail",
      dataIndex: "order",
      render: (order) => order.customerEmail,
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "planScreening",
      render: (planScreening) =>
        dayjs(planScreening?.projectDate).format("DD/MM/YYYY"),
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "planScreening",
      render: (planScreening) =>
        dayjs(planScreening?.projectTime).format("HH:mm"),
    },
    {
      title: "Số lượng vé",
      key: "numberOfTickets",
      dataIndex: "order",
      render: (_, record) =>
        record.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "order",
      render: (_, record) =>
        record.order.items?.map((item) => item.listChairValueF1).join(", "),
    },
    {
      title: "Đã in",
      dataIndex: "order",
      key: "printedOnUtc",
      width: 60,
      render: (order) => (
        <div className="flex items-center justify-center">
          {order?.printedOnUtc ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <X className="size-4 text-red-500" />
          )}
        </div>
      ),
      align: "center",
      fixed: "right",
    },
    {
      title: "",
      key: "operation",
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => console.log(record)}>
          In vé
        </Button>
      ),
      fixed: "right",
    },
  ];

  const onChange: PaginationProps["onChange"] = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    const url = `${window.location.pathname}?${params.toString()}`;
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <div className="space-y-3 mt-4 px-4">
      <Breadcrumb
        items={[
          {
            title: "Trang chủ",
          },
          {
            title: "Bán vé",
          },
          {
            title: "In vé online",
          },
        ]}
      />

      <Table
        dataSource={data?.data || []}
        columns={columns}
        loading={pending}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 220px)" }}
        pagination={{
          current: page,
          onChange,
          total: data?.total || 0,
          size: "middle",
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`,
          pageSize: 100,
          hideOnSinglePage: true,
        }}
      />
    </div>
  );
};

export default PrintOnlineTicketsClient;
