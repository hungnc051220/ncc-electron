import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { MoreOutlined } from "@ant-design/icons";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useMarkPrintedOrder } from "@renderer/hooks/orders/useMarkPrintedOrder";
import { useOrders } from "@renderer/hooks/orders/useOrders";
import { useUnmarkPrintedOrder } from "@renderer/hooks/orders/useUnmarkPrintedOrder";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { getPrintErrorMessage } from "@renderer/lib/print";
import {
  buildTicketsFromOrder,
  filterEmptyValues,
  formatNumber,
  formatSeatValues
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { OrderDetailProps, OrderStatus } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Dropdown, message } from "antd";
import dayjs from "dayjs";
import { Check, Eye, Printer, RotateCcw, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import OrderDetailDialog from "../orderHistory/components/OrderDetailDialog";
import Filter from "./components/Filter";

export interface ValuesProps {
  id?: string;
  barCode?: string;
  phoneNumber?: string;
  email?: string;
  dateRange?: [string, string];
}

export const getDefaultFilterValues = (): ValuesProps => ({
  dateRange: [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()]
});

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const compareNumber = (left?: number | null, right?: number | null) => (left || 0) - (right || 0);

const PrintOnlineTicketsPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>(() => getDefaultFilterValues());
  const [dialogViewDetailOpen, setDialogViewDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);

  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const { posShortName } = useSettingPosStore();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { can } = usePermission();
  const canView = can("print_online_tickets", "view");
  const canPrint = can("print_online_tickets", "print");

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
    const messageKey = `print-online-ticket-${orderDetail.order.id}`;

    message.loading({
      key: messageKey,
      content: "Đang in vé..."
    });

    try {
      const tickets = await buildTicketsFromOrder(orderDetail, user?.fullname, posShortName);
      await window.api.printTickets(tickets, selectedPrinter);
      message.success({
        key: messageKey,
        content: "In vé thành công"
      });
    } catch (error) {
      message.error({
        key: messageKey,
        content: getPrintErrorMessage(error),
        duration: 4
      });
      return;
    }

    await markPrintedOrder.mutateAsync(
      {
        orderId: orderDetail.order.id,
        posShortName
      },
      {
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Cập nhật trạng thái in vé thất bại"));
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
          message.error(getApiErrorMessage(error, "Cho phép in lại vé thất bại"));
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
      sorter: (a, b) => compareText(a.order.barCode, b.order.barCode),
      render: (order) => order.barCode,
      fixed: "left"
    },
    {
      title: "Mã thanh toán",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      sorter: (a, b) => compareNumber(a.order.id, b.order.id),
      render: (_, record) => record.order.id
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "order",
      sorter: (a, b) =>
        compareText(
          [a.order.customerFirstName, a.order.customerLastName].filter(Boolean).join(" "),
          [b.order.customerFirstName, b.order.customerLastName].filter(Boolean).join(" ")
        ),
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "film",
      sorter: (a, b) => dayjs(a.film?.filmName).valueOf() - dayjs(b.film?.filmName).valueOf(),
      render: (film) => film?.filmName
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "planScreening",
      sorter: (a, b) =>
        dayjs(a.planScreening?.projectDate).valueOf() -
        dayjs(b.planScreening?.projectDate).valueOf(),
      render: (planScreening) => dayjs(planScreening?.projectDate).format("DD/MM/YYYY")
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "planScreening",
      sorter: (a, b) =>
        dayjs(a.planScreening?.projectTime).valueOf() -
        dayjs(b.planScreening?.projectTime).valueOf(),
      render: (planScreening) => dayjs(planScreening?.projectTime).format("HH:mm")
    },
    {
      title: "Phòng chiếu",
      key: "roomName",
      dataIndex: "room",
      sorter: (a, b) => compareText(a.room?.name, b.room?.name),
      render: (room) => room?.name
    },
    {
      title: "Số lượng vé",
      key: "numberOfTickets",
      dataIndex: "order",
      sorter: (a, b) =>
        compareNumber(
          a.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          b.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
        ),
      render: (_, record) => record.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "order",
      render: (_, record) => formatSeatValues(record.order.items)
    },
    {
      title: "Đã in",
      dataIndex: "order",
      key: "printedOnUtc",
      width: 100,
      sorter: (a, b) => Number(!!a.order.printedOnUtc) - Number(!!b.order.printedOnUtc),
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
    ...(canView || canPrint
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: OrderDetailProps) => {
              const isPrinted = record.order.printedOnUtc;
              const items = [
                ...(canView
                  ? [
                      {
                        key: "1",
                        icon: <Eye size={16} />,
                        label: "Xem chi tiết",
                        onClick: () => handeViewDetail(record)
                      }
                    ]
                  : []),
                ...(canPrint
                  ? [
                      {
                        key: "2",
                        icon: isPrinted ? <RotateCcw size={16} /> : <Printer size={16} />,
                        label: isPrinted ? "Cho phép in lại vé" : "In vé",
                        onClick: () => (isPrinted ? onUnmarkPrinted(record) : onPrint(record))
                      }
                    ]
                  : [])
              ];

              return (
                <Dropdown menu={{ items }} arrow trigger={["click"]}>
                  <MoreOutlined />
                </Dropdown>
              );
            },
            align: "center" as const,
            fixed: "right" as const
          }
        ]
      : [])
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
        right={<Filter onSearch={onSearch} filterValues={filterValues} setCurrent={setCurrent} />}
      />

      <AutoHeightTable
        rowKey={(record) => record.order.id}
        dataSource={data?.data || []}
        columns={columns}
        bordered
        size="small"
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
        <OrderDetailDialog
          open={dialogViewDetailOpen}
          onOpenChange={handleDialogViewDetailClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default PrintOnlineTicketsPage;
