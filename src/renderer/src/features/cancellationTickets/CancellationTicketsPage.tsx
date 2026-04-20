import Icon, { MoreOutlined } from "@ant-design/icons";
import { cancelTicketsApi } from "@renderer/api/cancelTickets.api";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { CancellationTicketProps } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TableProps } from "antd";
import { Button, Dropdown, Table, Typography } from "antd";
import dayjs from "dayjs";
import { DownloadIcon, Eye } from "lucide-react";
import { type Key, useCallback, useEffect, useMemo, useState } from "react";
import OrderDetailDialog from "../orderHistory/components/OrderDetailDialog";
import { exportCancellationTicketsExcel } from "./components/exportCancellationTicketsExcel";
import Filter from "./components/Filter";

export interface ValuesProps {
  dateRange?: [string, string];
}

export const getDefaultFilterValues = (): ValuesProps => ({
  dateRange: [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()]
});

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const compareNumber = (left?: number | null, right?: number | null) => (left || 0) - (right || 0);
const CANCEL_TICKETS_PAGE_SIZE = 200;
type TableFilterState = Record<string, (Key | boolean)[] | null>;
type TableSorterState = {
  columnKey?: Key;
  order?: "ascend" | "descend" | null;
} | null;

const CancellationTicketsPage = () => {
  const { message } = useAntdApp();
  const [filterValues, setFilterValues] = useState<ValuesProps>(() => getDefaultFilterValues());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<TableFilterState>({});
  const [sorterState, setSorterState] = useState<TableSorterState>(null);
  const { can } = usePermission();
  const canView = can("cancellation_tickets", "view");

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").toISOString();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").toISOString();
    }

    return filtered;
  }, [filterValues]);

  const {
    data: cancellationTickets,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["cancel-tickets", params],
    queryFn: ({ pageParam = 1 }) =>
      cancelTicketsApi.getAll({
        current: pageParam,
        pageSize: CANCEL_TICKETS_PAGE_SIZE,
        ...(params as {
          fromDate?: string;
          toDate?: string;
        })
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

  const cancellationTicketRows = useMemo(
    () => cancellationTickets?.pages.flatMap((page) => page.data) ?? [],
    [cancellationTickets]
  );

  const displayedRows = useMemo(() => {
    const filteredRows = cancellationTicketRows.filter((record) => {
      const filmValues = columnFilters.filmName;
      const userNameValues = columnFilters.userName;

      const matchFilm =
        !filmValues?.length ||
        filmValues.some((value) =>
          (record.filmName || "").toLowerCase().includes(String(value).toLowerCase())
        );
      const matchUserName =
        !userNameValues?.length ||
        userNameValues.some((value) =>
          (record.userName || "").toLowerCase().includes(String(value).toLowerCase())
        );

      return matchFilm && matchUserName;
    });

    if (!sorterState?.order) {
      return filteredRows;
    }

    const sortedRows = [...filteredRows];
    const sortMultiplier = sorterState.order === "ascend" ? 1 : -1;

    sortedRows.sort((left, right) => {
      let result = 0;

      switch (sorterState.columnKey) {
        case "id":
          result = compareNumber(left.order?.id, right.order?.id);
          break;
        case "createdOnUtc":
          result = dayjs(left.createdOnUtc).valueOf() - dayjs(right.createdOnUtc).valueOf();
          break;
        case "customerName":
          result = compareText(
            [left.order?.customerFirstName, left.order?.customerLastName].filter(Boolean).join(" "),
            [right.order?.customerFirstName, right.order?.customerLastName]
              .filter(Boolean)
              .join(" ")
          );
          break;
        case "customerPhone":
          result = compareText(left.order?.customerPhone, right.order?.customerPhone);
          break;
        case "customerEmail":
          result = compareText(left.order?.customerEmail, right.order?.customerEmail);
          break;
        case "filmName":
          result = compareText(left.filmName, right.filmName);
          break;
        case "roomName":
          result = compareText(left.roomName, right.roomName);
          break;
        case "projectDate":
          result =
            dayjs(left.projectDate, "YYYY-MM-DD").valueOf() -
            dayjs(right.projectDate, "YYYY-MM-DD").valueOf();
          break;
        case "projectTime":
          result = dayjs(left.projectTime).valueOf() - dayjs(right.projectTime).valueOf();
          break;
        case "quantity":
          result = compareNumber(left.quantity, right.quantity);
          break;
        case "userName":
          result = compareText(left.userName, right.userName);
          break;
        case "reason":
          result = compareText(left.reason, right.reason);
          break;
        default:
          result = 0;
      }

      return result * sortMultiplier;
    });

    return sortedRows;
  }, [cancellationTicketRows, columnFilters, sorterState]);

  const totalRecords = displayedRows.length;
  const totalQuantity = useMemo(
    () =>
      displayedRows.reduce((sum, record) => {
        return sum + Number(record.quantity || 0);
      }, 0),
    [displayedRows]
  );
  const filmColumnFilters = useMemo(
    () =>
      Array.from(
        new Set(
          cancellationTicketRows
            .map((record) => record.filmName?.trim())
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => compareText(left, right))
        .map((filmName) => ({
          text: filmName,
          value: filmName
        })),
    [cancellationTicketRows]
  );
  const userNameColumnFilters = useMemo(
    () =>
      Array.from(
        new Set(
          cancellationTicketRows
            .map((record) => record.userName?.trim())
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => compareText(left, right))
        .map((userName) => ({
          text: userName,
          value: userName
        })),
    [cancellationTicketRows]
  );

  const handleViewDetail = useCallback((record: CancellationTicketProps) => {
    if (!record.order?.id) {
      return;
    }

    setSelectedOrderId(record.order.id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedOrderId(null);
    }
  }, []);

  const columns: TableProps<CancellationTicketProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Mã đơn huỷ",
      key: "id",
      dataIndex: "id",
      sorter: (a, b) => compareNumber(a.order?.id, b.order?.id),
      render: (_, record) => record.order?.id,
      fixed: "left",
      width: 120
    },
    {
      title: "Thời gian hủy",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      sorter: (a, b) => dayjs(a.createdOnUtc).valueOf() - dayjs(b.createdOnUtc).valueOf(),
      render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY"),
      width: 150
    },
    {
      title: "Tên khách hàng",
      key: "customerName",
      dataIndex: "order",
      sorter: (a, b) =>
        compareText(
          [a.order?.customerFirstName, a.order?.customerLastName].filter(Boolean).join(" "),
          [b.order?.customerFirstName, b.order?.customerLastName].filter(Boolean).join(" ")
        ),
      render: (order) =>
        [order?.customerFirstName, order?.customerLastName].filter(Boolean).join(" ")
    },
    {
      title: "Số điện thoại",
      key: "customerPhone",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order?.customerPhone, b.order?.customerPhone),
      render: (order) => order?.customerPhone
    },
    {
      title: "Email",
      key: "customerEmail",
      dataIndex: "order",
      sorter: (a, b) => compareText(a.order?.customerEmail, b.order?.customerEmail),
      render: (order) => order?.customerEmail,
      width: 200
    },
    {
      title: "Phim",
      key: "filmName",
      dataIndex: "filmName",
      sorter: (a, b) => compareText(a.filmName, b.filmName),
      width: 500,
      filterSearch: true,
      onFilter: (value, record) =>
        (record.filmName || "").toLowerCase().includes(String(value).toLowerCase()),
      filters: filmColumnFilters
    },
    {
      title: "Phòng",
      key: "roomName",
      dataIndex: "roomName",
      sorter: (a, b) => compareText(a.roomName, b.roomName),
      width: 80
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      sorter: (a, b) =>
        dayjs(a.projectDate, "YYYY-MM-DD").valueOf() - dayjs(b.projectDate, "YYYY-MM-DD").valueOf(),
      render: (value: string) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY")
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      sorter: (a, b) => dayjs(a.projectTime).valueOf() - dayjs(b.projectTime).valueOf(),
      render: (value: string) => dayjs(value).format("HH:mm")
    },
    {
      title: "Số vé",
      key: "quantity",
      dataIndex: "quantity",
      sorter: (a, b) => compareNumber(a.quantity, b.quantity),
      width: 120,
      align: "right"
    },
    {
      title: "Vị trí ghế",
      key: "cancelChairValue",
      dataIndex: "cancelChairValue",
      render: (_, record) => {
        const seatCodes = [
          record.cancelChairValueF1,
          record.cancelChairValueF2,
          record.cancelChairValueF3
        ]
          .filter((i) => i.trim() !== "")
          .join(", ");
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
      title: "Người hủy",
      key: "userName",
      dataIndex: "userName",
      sorter: (a, b) => compareText(a.userName, b.userName),
      filterSearch: true,
      onFilter: (value, record) =>
        (record.userName || "").toLowerCase().includes(String(value).toLowerCase()),
      filters: userNameColumnFilters
    },
    {
      title: "Lý do hủy",
      key: "reason",
      dataIndex: "reason",
      sorter: (a, b) => compareText(a.reason, b.reason),
      fixed: "right"
    },
    ...(canView
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: CancellationTicketProps) => (
              <Dropdown
                menu={{
                  items: [{ key: "view", icon: <Eye size={16} />, label: "Xem chi tiết" }],
                  onClick: (e) => {
                    if (e.key === "view" && record.order?.id) {
                      handleViewDetail(record);
                    }
                  }
                }}
                arrow
                trigger={["click"]}
              >
                <MoreOutlined />
              </Dropdown>
            ),
            align: "center" as const,
            fixed: "right" as const
          }
        ]
      : [])
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  const handleTableChange: TableProps<CancellationTicketProps>["onChange"] = (
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

  const handleExportExcel = useCallback(async () => {
    if (displayedRows.length === 0) {
      message.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    const messageKey = "export-cancellation-tickets";
    message.open({
      key: messageKey,
      type: "loading",
      content: "Đang xuất file Excel...",
      duration: 0
    });

    try {
      const result = await exportCancellationTicketsExcel({
        data: displayedRows,
        fromDate: filterValues.dateRange?.[0],
        toDate: filterValues.dateRange?.[1]
      });

      if (result.canceled) {
        message.open({
          key: messageKey,
          type: "warning",
          content: "Bạn đã hủy lưu file Excel"
        });
        return;
      }

      message.open({
        key: messageKey,
        type: "success",
        content: "Xuất file Excel thành công"
      });
    } catch (error) {
      message.open({
        key: messageKey,
        type: "error",
        content: error instanceof Error ? error.message : "Xuất file Excel thất bại"
      });
    }
  }, [displayedRows, filterValues.dateRange, message]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <Button
              variant="solid"
              color="green"
              onClick={() => void handleExportExcel()}
              disabled={displayedRows.length === 0}
              loading={isFetching || isFetchingNextPage}
              icon={<Icon component={DownloadIcon} />}
            >
              Xuất Excel
            </Button>
            <Filter filterValues={filterValues} onSearch={onSearch} setCurrent={() => undefined} />
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={displayedRows}
        columns={columns}
        onChange={handleTableChange}
        bordered
        size="small"
        virtual
        scroll={{ x: 2400 }}
        loading={isFetching || isFetchingNextPage}
        pagination={false}
        summary={() =>
          displayedRows.length > 0 ? (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} />
                <Table.Summary.Cell index={1} align="right">
                  <span className="font-bold">{formatNumber(totalRecords)} đơn</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={8} />

                <Table.Summary.Cell index={10} align="right">
                  <span className="font-bold">{formatNumber(totalQuantity)} vé</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11} colSpan={columns.length - 11} />
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />

      {dialogOpen && (
        <OrderDetailDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          selectedOrderId={selectedOrderId}
        />
      )}
    </div>
  );
};

export default CancellationTicketsPage;
