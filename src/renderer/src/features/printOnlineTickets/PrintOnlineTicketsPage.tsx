import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { MoreOutlined } from "@ant-design/icons";
import { ordersApi } from "@renderer/api/orders.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useMarkPrintedOrder } from "@renderer/hooks/orders/useMarkPrintedOrder";
import { useUnmarkPrintedOrder } from "@renderer/hooks/orders/useUnmarkPrintedOrder";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { getPrintErrorMessage } from "@renderer/lib/print";
import {
  buildTicketsFromOrder,
  formatNumber,
  formatSeatValues,
  compareText,
  compareNumber,
  compareNullableText
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { usePrinterStore } from "@renderer/store/printer.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { OrderDetailProps, OrderStatus } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TableProps } from "antd";
import { Dropdown, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { Check, Eye, Printer, RotateCcw, X } from "lucide-react";
import { type Key, useCallback, useEffect, useMemo, useState } from "react";
import OrderDetailDialog from "../orderHistory/components/OrderDetailDialog";
import Filter from "./components/Filter";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import type { Dayjs } from "dayjs";

export interface ValuesProps {
  projectDate: Dayjs;
}

export const getDefaultFilterValues = (): ValuesProps => ({
  projectDate: dayjs()
});

const PRINT_ONLINE_TICKETS_PAGE_SIZE = 300;
const getPrintedOnUtcTimestamp = (printedOnUtc?: string | null) =>
  printedOnUtc ? dayjs(printedOnUtc).valueOf() : 0;

type TableFilterState = Record<string, (Key | boolean)[] | null>;
type TableSorterState = {
  columnKey?: Key;
  order?: "ascend" | "descend" | null;
} | null;

const PrintOnlineTicketsPage = () => {
  const { message } = useAntdApp();

  const [filterValues, setFilterValues] = useState<ValuesProps>(() => getDefaultFilterValues());
  const [dialogViewDetailOpen, setDialogViewDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);
  const [columnFilters, setColumnFilters] = useState<TableFilterState>({});
  const [sorterState, setSorterState] = useState<TableSorterState>(null);

  const selectedPrinter = usePrinterStore((s) => s.selectedPrinter);
  const { posShortName } = useSettingPosStore();
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { can } = usePermission();
  const canView = can("print_online_tickets", "view");
  const canPrint = can("print_online_tickets", "print");

  const params = useMemo(() => {
    const filtered: Record<string, unknown> = {};

    filtered.isOnline = true;
    filtered.orderStatusId = OrderStatus.COMPLETED;
    filtered.projectDate = filterValues.projectDate.format("YYYY-MM-DD");

    return filtered;
  }, [filterValues]);

  const {
    data: orders,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetching,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ["print-online-orders", params],
    queryFn: ({ pageParam = 1 }) =>
      ordersApi.getAll({
        current: pageParam,
        pageSize: PRINT_ONLINE_TICKETS_PAGE_SIZE,
        ...params
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const markPrintedOrder = useMarkPrintedOrder();
  const unmarkPrintedOrder = useUnmarkPrintedOrder();

  const orderRows = useMemo(() => orders?.pages.flatMap((page) => page.data) ?? [], [orders]);

  const barCodeColumnFilters = useMemo(
    () =>
      Array.from(
        new Set(
          orderRows
            .map((record) => record.order.barCode?.trim())
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => compareText(left, right))
        .map((barCode) => ({
          text: barCode,
          value: barCode
        })),
    [orderRows]
  );

  const paymentIdColumnFilters = useMemo(
    () =>
      Array.from(
        new Set(
          orderRows
            .map((record) => record.order.id)
            .filter((value): value is number => typeof value === "number")
        )
      )
        .sort((left, right) => compareNumber(left, right))
        .map((paymentId) => ({
          text: String(paymentId),
          value: String(paymentId)
        })),
    [orderRows]
  );

  const customerPhoneColumnFilters = useMemo(
    () =>
      Array.from(
        new Set(
          orderRows
            .map((record) => record.order.customerPhone?.trim())
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => compareText(left, right))
        .map((customerPhone) => ({
          text: customerPhone,
          value: customerPhone
        })),
    [orderRows]
  );

  const customerNameColumnFilters = useMemo(
    () =>
      Array.from(
        new Set(
          orderRows
            .map((record) =>
              [record.order.customerFirstName, record.order.customerLastName]
                .filter(Boolean)
                .join(" ")
                .trim()
            )
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => compareText(left, right))
        .map((customerName) => ({
          text: customerName,
          value: customerName
        })),
    [orderRows]
  );

  const filmNameColumnFilters = useMemo(
    () =>
      Array.from(
        new Set(
          orderRows
            .map((record) => record.film?.filmName?.trim())
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => compareText(left, right))
        .map((filmName) => ({
          text: filmName,
          value: filmName
        })),
    [orderRows]
  );

  const roomNameColumnFilters = useMemo(
    () =>
      Array.from(
        new Set(
          orderRows
            .map((record) => record.room?.name?.trim())
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => compareText(left, right))
        .map((roomName) => ({
          text: roomName,
          value: roomName
        })),
    [orderRows]
  );

  const displayedRows = useMemo(() => {
    const filteredRows = orderRows.filter((record) => {
      const barCodeValues = columnFilters.barCode;
      const paymentIdValues = columnFilters.paymentId;
      const customerNameValues = columnFilters.customerName;
      const filmNameValues = columnFilters.filmName;
      const roomNameValues = columnFilters.roomName;

      const customerName = [record.order.customerFirstName, record.order.customerLastName]
        .filter(Boolean)
        .join(" ");

      const matchBarCode =
        !barCodeValues?.length ||
        barCodeValues.some((value) =>
          (record.order.barCode || "").toLowerCase().includes(String(value).toLowerCase())
        );
      const matchPaymentId =
        !paymentIdValues?.length ||
        paymentIdValues.some((value) => String(record.order.id || "").includes(String(value)));
      const matchCustomerName =
        !customerNameValues?.length ||
        customerNameValues.some((value) =>
          customerName.toLowerCase().includes(String(value).toLowerCase())
        );
      const matchFilmName =
        !filmNameValues?.length ||
        filmNameValues.some((value) =>
          (record.film?.filmName || "").toLowerCase().includes(String(value).toLowerCase())
        );
      const matchRoomName =
        !roomNameValues?.length ||
        roomNameValues.some((value) =>
          (record.room?.name || "").toLowerCase().includes(String(value).toLowerCase())
        );

      return matchBarCode && matchPaymentId && matchCustomerName && matchFilmName && matchRoomName;
    });

    if (!sorterState?.order) {
      return filteredRows;
    }

    const sortedRows = [...filteredRows];
    const sortMultiplier = sorterState.order === "ascend" ? 1 : -1;

    sortedRows.sort((left, right) => {
      let result = 0;

      switch (sorterState.columnKey) {
        case "barCode":
          result = compareText(left.order.barCode, right.order.barCode);
          break;
        case "printedOnUtc":
          result = compareNumber(
            getPrintedOnUtcTimestamp(left.order.printedOnUtc),
            getPrintedOnUtcTimestamp(right.order.printedOnUtc)
          );
          break;
        case "paymentId":
          result = compareNumber(left.order.id, right.order.id);
          break;
        case "customerName":
          result = compareText(
            [left.order.customerFirstName, left.order.customerLastName].filter(Boolean).join(" "),
            [right.order.customerFirstName, right.order.customerLastName].filter(Boolean).join(" ")
          );
          break;
        case "filmName":
          result = compareText(left.film?.filmName, right.film?.filmName);
          break;
        case "roomName":
          result = compareNullableText(left.room?.name, right.room?.name);
          break;
        case "isPrinted":
          result = Number(!!left.order.printedOnUtc) - Number(!!right.order.printedOnUtc);
          break;
        default:
          result = 0;
      }

      return result * sortMultiplier;
    });

    return sortedRows;
  }, [orderRows, columnFilters, sorterState]);

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
      render: (_, __, index) => index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Mã đặt vé",
      key: "barCode",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order.barCode, b.order.barCode),
      filterSearch: true,
      onFilter: (value, record) =>
        (record.order.barCode || "").toLowerCase().includes(String(value).toLowerCase()),
      filters: barCodeColumnFilters,
      render: (order) => order.barCode,
      fixed: "left",
      width: 150
    },
    {
      title: "Thời gian in vé",
      key: "printedOnUtc",
      dataIndex: "order",
      sorter: (a, b) =>
        compareNumber(
          getPrintedOnUtcTimestamp(a.order.printedOnUtc),
          getPrintedOnUtcTimestamp(b.order.printedOnUtc)
        ),
      render: (order) =>
        order.printedOnUtc ? dayjs(order.printedOnUtc).format("HH:mm DD/MM/YYYY") : "",
      width: 150,
      align: "center"
    },
    {
      title: "Mã thanh toán",
      key: "paymentId",
      dataIndex: "createdOnUtc",
      sorter: (a, b) => compareNumber(a.order.id, b.order.id),
      filterSearch: true,
      onFilter: (value, record) => String(record.order.id || "").includes(String(value)),
      filters: paymentIdColumnFilters,
      render: (_, record) => record.order.id,
      width: 150
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
      filterSearch: true,
      onFilter: (value, record) =>
        [record.order.customerFirstName, record.order.customerLastName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(String(value).toLowerCase()),
      filters: customerNameColumnFilters,
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" "),
      width: 200
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order.customerPhone, b.order.customerPhone),
      filterSearch: true,
      onFilter: (value, record) =>
        (record.order.customerPhone || "").toLowerCase().includes(String(value).toLowerCase()),
      filters: customerPhoneColumnFilters,
      render: (order) => order?.customerPhone,
      width: 200
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "film",
      sorter: (a, b) => compareText(a.film?.filmName, b.film?.filmName),
      filterSearch: true,
      onFilter: (value, record) =>
        (record.film?.filmName || "").toLowerCase().includes(String(value).toLowerCase()),
      filters: filmNameColumnFilters,
      render: (film) => film?.filmName,
      width: 500
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "planScreening",
      sorter: (a, b) =>
        dayjs(a.planScreening?.projectDate).valueOf() -
        dayjs(b.planScreening?.projectDate).valueOf(),
      render: (planScreening) => dayjs(planScreening?.projectDate).format("DD/MM/YYYY"),
      width: 130,
      align: "center"
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "planScreening",
      sorter: (a, b) =>
        dayjs(a.planScreening?.projectTime).valueOf() -
        dayjs(b.planScreening?.projectTime).valueOf(),
      render: (planScreening) => dayjs(planScreening?.projectTime).format("HH:mm"),
      width: 120,
      align: "center"
    },
    {
      title: "Phòng",
      key: "roomName",
      dataIndex: "room",
      sorter: (a, b) => compareNullableText(a.room?.name, b.room?.name),
      filterSearch: true,
      onFilter: (value, record) =>
        (record.room?.name || "").toLowerCase().includes(String(value).toLowerCase()),
      filters: roomNameColumnFilters,
      render: (room) => room?.name,
      width: 100,
      align: "center"
    },
    {
      title: "Số vé",
      key: "numberOfTickets",
      dataIndex: "order",
      sorter: (a, b) =>
        compareNumber(
          a.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          b.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
        ),
      render: (_, record) => record.order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      width: 120,
      align: "right"
    },
    {
      title: "Vị trí ghế",
      key: "positions",
      dataIndex: "order",
      render: (_, record) => {
        const seatCodes = formatSeatValues(record.order.items);
        return (
          <div className="flex-1 overflow-hidden">
            <Typography.Text className="max-w-full" ellipsis={{ tooltip: seatCodes || undefined }}>
              {seatCodes}
            </Typography.Text>
          </div>
        );
      }
    },
    {
      title: "Đã in",
      dataIndex: "order",
      key: "isPrinted",
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

  const handleTableChange: TableProps<OrderDetailProps>["onChange"] = (
    _pagination,
    filters,
    sorter
  ) => {
    setColumnFilters(filters as TableFilterState);
    setSorterState(
      Array.isArray(sorter)
        ? sorter[0]
          ? { columnKey: sorter[0].columnKey, order: sorter[0].order }
          : null
        : { columnKey: sorter.columnKey, order: sorter.order }
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <Filter onSearch={onSearch} filterValues={filterValues} setCurrent={() => undefined} />
            <RefreshButton loading={isFetching || isFetchingNextPage} onRefresh={() => refetch()} />
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.order.id}
        dataSource={displayedRows}
        columns={columns}
        onChange={handleTableChange}
        bordered
        size="small"
        virtual
        scroll={{ x: 2000 }}
        loading={isLoading}
        pagination={false}
        //@ts-ignore // This property is not exported, but it can be passed through to the internal virtual scrolling
        listItemHeight={54}
        footer={() => (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Tổng {formatNumber(displayedRows.length)} bản ghi</span>
            {isFetchingNextPage && (
              <span className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Spin size="small" />
                Đang tải thêm dữ liệu...
              </span>
            )}
          </div>
        )}
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
