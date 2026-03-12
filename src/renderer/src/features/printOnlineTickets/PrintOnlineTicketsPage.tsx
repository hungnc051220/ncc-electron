import { MoreOutlined } from "@ant-design/icons";
import { useMarkPrintedOrder } from "@renderer/hooks/orders/useMarkPrintedOrder";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { useUnmarkPrintedOrder } from "@renderer/hooks/orders/useUnmarkPrintedOrder";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { buildTicketsFromOrder, filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { ApiError, OrderDetailProps, OrderStatus } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Dropdown, message, Table } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { Check, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import OrderHistoryDialog from "../orderHistory/components/OrderHistoryDialog";
import Filter from "./components/Filter";

export interface ValuesProps {
  id?: string;
  barCode?: string;
  phoneNumber?: string;
  email?: string;
  dateRange?: [string, string];
}

const PrintOnlineTicketsPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});
  const [dialogViewDetailOpen, setDialogViewDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);

  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const { posShortName } = useSettingPosStore();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    filtered.isOnline = true;
    filtered.orderStatusId = OrderStatus.COMPLETED;

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

  const { data, isFetching } = useOrders(params);
  const markPrintedOrder = useMarkPrintedOrder();
  const unmarkPrintedOrder = useUnmarkPrintedOrder();

  const onPrint = async (orderDetail: OrderDetailProps) => {
    try {
      const tickets = await buildTicketsFromOrder(orderDetail, user?.fullname, posShortName);
      await window.api.printTickets(tickets, selectedPrinter);
      message.success("In vé thành công");
    } catch {
      message.error("In vé thất bại");
    }

    await markPrintedOrder.mutateAsync(
      {
        orderId: orderDetail.order.id,
        posShortName
      },
      {
        onError: (error: unknown) => {
          let msg = "Cập nhật trạng thái in vé thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

  const onUnmarkPrinted = async (orderDetail: OrderDetailProps) => {
    unmarkPrintedOrder.mutate(
      { orderId: orderDetail.order.id },
      {
        onSuccess: () => {
          message.success("Cho phép in lại vé thành công");
        },
        onError: (error: unknown) => {
          let msg = "Cho phép in lại vé thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

  const handeViewDetail = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogViewDetailOpen(true);
  }, []);

  const handleDialogViewDetailClose = useCallback((open: boolean) => {
    setDialogViewDetailOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const columns: TableProps<OrderDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },

    {
      title: "Mã đặt vé",
      key: "barCode",
      dataIndex: "order",
      render: (order) => order.barCode,
      fixed: "left"
    },
    {
      title: "Mã thanh toán",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (_, record) => record.order.id
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "order",
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "planScreening",
      render: (planScreening) => dayjs(planScreening?.projectDate).format("DD/MM/YYYY")
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "planScreening",
      render: (planScreening) => dayjs(planScreening?.projectTime).format("HH:mm")
    },
    {
      title: "Phòng chiếu",
      key: "roomName",
      dataIndex: "room",
      render: (room) => room?.name
    },
    {
      title: "Số lượng vé",
      key: "numberOfTickets",
      dataIndex: "order",
      render: (_, record) => record.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "order",
      render: (_, record) => record.order.items?.map((item) => item.listChairValueF1).join(", ")
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
      fixed: "right"
    },
    {
      title: "",
      key: "operation",
      width: 50,
      render: (_, record) => {
        const isPrinted = record.order.printedOnUtc;

        return (
          <Dropdown
            menu={{
              items: [
                { key: "1", label: "Xem chi tiết", onClick: () => handeViewDetail(record) },
                {
                  key: "2",
                  label: isPrinted ? "Cho phép in lại vé" : "In vé",
                  onClick: () => (isPrinted ? onUnmarkPrinted(record) : onPrint(record))
                }
              ]
            }}
            arrow
            trigger={["click"]}
          >
            <MoreOutlined />
          </Dropdown>
        );
      },
      align: "center",
      fixed: "right"
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
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Bán vé"
            },
            {
              title: "In vé online"
            }
          ]}
        />
        <Filter onSearch={onSearch} filterValues={filterValues} setCurrent={setCurrent} />
      </div>

      <Table
        rowKey={(record) => record.order.id}
        dataSource={data?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
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

      {dialogViewDetailOpen && selectedItem && (
        <OrderHistoryDialog
          open={dialogViewDetailOpen}
          onOpenChange={handleDialogViewDetailClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default PrintOnlineTicketsPage;
