"use client";

import { MoreOutlined } from "@ant-design/icons";
import { useInvitationTicketBackgrounds } from "@renderer/hooks/invitationTickets/useInvitationTicketBackgrounds";
import { useOrders } from "@renderer/hooks/orders/useUsers";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { OrderDetailProps, OrderStatus } from "@shared/types";
import { Breadcrumb, Button, Dropdown, Table, type PaginationProps, type TableProps } from "antd";
import dayjs from "dayjs";
import { Check, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import Filter from "./components/Filter";
import PrintInvitationTicketDialog from "./components/PrintInvitationTicketDialog";
import { useNavigate } from "react-router";
import OrderHistoryDialog from "../orderHistory/components/OrderHistoryDialog";

const actionItems = [
  { key: "1", label: "Xem chi tiết" },
  { key: "2", label: "Xuất vé mời" }
];

export interface ValuesProps {
  dateRange?: [string, string];
}

const InvitationTicketsPage = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    dateRange: [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()]
  });
  const [dialogPrintOpen, setDialogPrintOpen] = useState(false);
  const [dialogViewDetailOpen, setDialogViewDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);

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
      isInvitation: true,
      orderStatusId: OrderStatus.COMPLETED,
      ...filtered
    };
  }, [current, pageSize, filterValues]);

  const { data: invitationTickets, isFetching } = useOrders(params);
  const { data: backgrounds, isFetching: isFetchingBackgrounds } = useInvitationTicketBackgrounds();

  const handleViewShowtimes = () => {
    navigate(`/showtimes?callbackUrl=/invitation-tickets&id=create`);
  };

  const handeViewDetail = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogViewDetailOpen(true);
  }, []);

  const handlePrint = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogPrintOpen(true);
  }, []);

  const handleDialogViewDetailClose = useCallback((open: boolean) => {
    setDialogViewDetailOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleDialogPrintClose = useCallback((open: boolean) => {
    setDialogPrintOpen(open);
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
      title: "Mã vé",
      key: "barCode",
      dataIndex: "barCode",
      render: (_, record) => record.order?.barCode || "",
      fixed: "left"
    },
    {
      title: "Phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.film?.filmName || ""
    },
    {
      title: "Phòng chiếu",
      key: "roomName",
      dataIndex: "roomName",
      render: (_, record) => record.room?.name || ""
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (_, record) => {
        return record.planScreening?.projectDate
          ? dayjs(record.planScreening?.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY")
          : "";
      }
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (_, record) => {
        return record.planScreening?.projectTime
          ? dayjs(record.planScreening?.projectTime).format("HH:mm")
          : "";
      }
    },
    {
      title: "Số vé",
      key: "quantity",
      dataIndex: "quantity",
      render: (_, record) => {
        const tickets = record.order?.items || [];
        const totalQuantity = tickets.reduce((acc, cur) => acc + cur.quantity, 0);
        return totalQuantity;
      }
    },
    {
      title: "Vị trí ghế",
      key: "cancelChairValue",
      dataIndex: "cancelChairValue",
      render: (_, record) => {
        const chairsF1 = record.order?.items?.map((item) => item.listChairValueF1);
        const chairsF2 = record.order?.items?.map((item) => item.listChairValueF2);
        const chairsF3 = record.order?.items?.map((item) => item.listChairValueF3);
        const allChairs = [...chairsF1, ...chairsF2, ...chairsF3].filter(Boolean);
        return allChairs.join(", ");
      }
    },
    {
      title: "Người tạo",
      key: "createdBy",
      dataIndex: "createdBy"
    },
    {
      title: "Người nhận",
      key: "receiver",
      dataIndex: "receiver"
    },
    {
      title: "Ngày tạo",
      key: "createdAt",
      dataIndex: "createdAt",
      render: (_, record) => dayjs(record.order.createdOnUtc).format("DD/MM/YYYY")
    },
    {
      title: "Xuất vé mời",
      key: "isPrinted",
      dataIndex: "isPrinted",
      render: (_, record) => {
        return (
          <div className="flex justify-center">
            {record.order?.printedOnUtc ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <X className="size-4 text-red-500" />
            )}
          </div>
        );
      },
      align: "center",
      fixed: "right"
    },
    {
      title: "",
      key: "operation",
      width: 50,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: actionItems,
            onClick: (e) => {
              if (e.key === "1") {
                handeViewDetail(record);
              }
              if (e.key === "2") {
                handlePrint(record);
              }
            }
          }}
          arrow
          trigger={["click"]}
        >
          <MoreOutlined />
        </Dropdown>
      ),
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
              title: "Trang chủ",
              href: "/"
            },
            {
              title: "Bán vé"
            },
            {
              title: "Quản lý giấy mời"
            }
          ]}
        />
        <div className="flex items-center gap-2">
          <Filter filterValues={filterValues} onSearch={onSearch} setCurrent={setCurrent} />
          <Button type="primary" onClick={handleViewShowtimes}>
            Xem sơ đồ vé
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.order.id}
        dataSource={invitationTickets?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: invitationTickets?.total || 0,
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

      {dialogPrintOpen && selectedItem && (
        <PrintInvitationTicketDialog
          open={dialogPrintOpen}
          onOpenChange={handleDialogPrintClose}
          backgrounds={backgrounds || []}
          isFetchingBackgrounds={isFetchingBackgrounds}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default InvitationTicketsPage;
