import { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useCancelTickets } from "@renderer/hooks/useCancelTickets";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { CancellationTicketProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import dayjs from "dayjs";
import { Dropdown } from "antd";
import { Eye } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import OrderDetailDialog from "../orderHistory/components/OrderDetailDialog";
import Filter from "./components/Filter";

export interface ValuesProps {
  filmId?: number;
  userId?: number;
  dateRange?: [string, string];
}

export const getDefaultFilterValues = (): ValuesProps => ({
  dateRange: [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()]
});

const compareText = (left?: string | null, right?: string | null) =>
  (left || "").localeCompare(right || "", "vi", { sensitivity: "base" });

const compareNumber = (left?: number | null, right?: number | null) => (left || 0) - (right || 0);

const CancellationTicketsPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>(() => getDefaultFilterValues());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { can } = usePermission();
  const canView = can("cancellation_tickets", "view");

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

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

  const { data: cancellationTickets, isFetching } = useCancelTickets(params);

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
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Mã đơn",
      key: "id",
      dataIndex: "id",
      sorter: (a, b) => compareNumber(a.order?.id, b.order?.id),
      render: (_, record) => record.order?.id ?? "-",
      fixed: "left"
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
      render: (order) => order?.customerEmail
    },
    {
      title: "Phim",
      key: "filmName",
      dataIndex: "filmName",
      sorter: (a, b) => compareText(a.filmName, b.filmName),
      width: 500
    },
    {
      title: "Phòng",
      key: "roomName",
      dataIndex: "roomName",
      sorter: (a, b) => compareText(a.roomName, b.roomName)
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
      sorter: (a, b) => compareNumber(a.quantity, b.quantity)
    },
    {
      title: "Vị trí ghế",
      key: "cancelChairValue",
      dataIndex: "cancelChairValue",
      render: (_, record) =>
        [record.cancelChairValueF1, record.cancelChairValueF2, record.cancelChairValueF3]
          .filter((i) => i.trim() !== "")
          .join(", ")
    },
    {
      title: "Người hủy",
      key: "userName",
      dataIndex: "userName",
      sorter: (a, b) => compareText(a.userName, b.userName)
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
        right={<Filter filterValues={filterValues} onSearch={onSearch} setCurrent={setCurrent} />}
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={cancellationTickets?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: cancellationTickets?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
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
