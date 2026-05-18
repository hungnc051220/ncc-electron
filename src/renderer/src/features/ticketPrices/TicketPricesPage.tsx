import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { useTicketPrices } from "@renderer/hooks/ticketPrices/useTicketPrices";
import {
  formatMoney,
  formatNumber,
  compareText,
  compareNumber,
  compareDate
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { TicketPriceProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown } from "antd";
import { PlusIcon, SquarePen, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteTicketPriceDialog from "./components/DeleteTicketPriceDialog";
import TicketPriceDialog from "./components/TicketPriceDialog";
import dayjs from "dayjs";

const TicketPricesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedTicketPrice, setSelectedTicketPrice] = useState<TicketPriceProps | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: ticketPrices, isFetching, refetch } = useTicketPrices(params);
  const { can } = usePermission();
  const canCreate = can("ticket_prices", "create");
  const canUpdate = can("ticket_prices", "update");
  const canDelete = can("ticket_prices", "delete");

  const handleAdd = useCallback(() => {
    setSelectedTicketPrice(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: TicketPriceProps) => {
    setSelectedTicketPrice(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: TicketPriceProps) => {
    setSelectedTicketPrice(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedTicketPrice(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedTicketPrice(null);
    }
  }, []);

  const actionItems = [
    ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canDelete ? [{ key: "2", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
  ];

  const columns: TableProps<TicketPriceProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Mã phiên bản",
      key: "versionCode",
      dataIndex: "versionCode",
      width: 150,
      sorter: (a, b) => compareText(a.versionCode, b.versionCode)
    },
    {
      title: "Loại ghế",
      key: "position",
      dataIndex: "position",
      sorter: (a, b) => compareText(a.position?.name, b.position?.name),
      render: (_, record) => record.position?.name
    },
    {
      title: "Ca chiếu",
      key: "daypart",
      dataIndex: "daypart",
      sorter: (a, b) => compareText(a.daypart?.name, b.daypart?.name),
      render: (_, record) => record.daypart?.name
    },
    {
      title: "Giá vé",
      key: "price",
      dataIndex: "price",
      sorter: (a, b) => compareNumber(a.price, b.price),
      render: (price) => formatMoney(price),
      align: "right",
      width: 200
    },
    {
      title: "Ngày áp dụng",
      key: "pricingDate",
      dataIndex: "pricingDate",
      sorter: (a, b) => compareDate(a.pricingDate, b.pricingDate),
      render: (pricingDate) => pricingDate && dayjs(pricingDate).format("DD/MM/YYYY")
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: TicketPriceProps) => (
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: (e) => {
                    if (e.key === "1") {
                      handleEdit(record);
                    }
                    if (e.key === "2") {
                      handleDelete(record);
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
        right={
          <>
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
            {canCreate && (
              <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
                Thêm giá vé
              </Button>
            )}
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={ticketPrices?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: ticketPrices?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <TicketPriceDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingTicketPrice={selectedTicketPrice}
        />
      )}
      {selectedTicketPrice && deleteDialogOpen && (
        <DeleteTicketPriceDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedTicketPrice.id}
          name={selectedTicketPrice.versionCode}
        />
      )}
    </div>
  );
};

export default TicketPricesPage;
