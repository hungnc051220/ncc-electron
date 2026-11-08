import Icon, { EditOutlined, MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { useTicketPrices } from "@renderer/hooks/ticketPrices/useTicketPrices";
import { useU22PriceConfig } from "@renderer/hooks/ticketPrices/useU22PriceConfig";
import {
  formatMoney,
  formatNumber,
  compareText,
  compareNumber,
  compareDate
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { TicketPriceProps } from "@shared/types";
import type { PaginationProps, TableProps, TabsProps } from "antd";
import { Button, Dropdown, Tabs } from "antd";
import { PlusIcon, SquarePen, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteTicketPriceDialog from "./components/DeleteTicketPriceDialog";
import TicketPriceDialog from "./components/TicketPriceDialog";
import U22PriceEditDialog from "./components/u22/U22PriceEditDialog";
import U22PriceTab from "./components/u22/U22PriceTab";
import dayjs from "dayjs";

type TicketPricesTab = "prices" | "u22";

const TAB_ITEMS: TabsProps["items"] = [
  { key: "prices", label: "Giá vé" },
  { key: "u22", label: "Giá vé U22" }
];

const TicketPricesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedTicketPrice, setSelectedTicketPrice] = useState<TicketPriceProps | null>(null);
  const [activeTab, setActiveTab] = useState<TicketPricesTab>("prices");
  const [u22DialogOpen, setU22DialogOpen] = useState(false);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: ticketPrices, isFetching, refetch } = useTicketPrices(params);
  const u22Config = useU22PriceConfig(activeTab === "u22");
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
            {activeTab === "prices" ? (
              <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
            ) : (
              <RefreshButton loading={u22Config.isFetching} onRefresh={() => u22Config.refetch()} />
            )}
            {activeTab === "prices" && canCreate && (
              <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
                Thêm giá vé
              </Button>
            )}
            {activeTab === "u22" && canUpdate && u22Config.data && !u22Config.error && (
              <Button type="primary" onClick={() => setU22DialogOpen(true)} icon={<EditOutlined />}>
                Chỉnh sửa giá
              </Button>
            )}
          </>
        }
      />

      <Tabs
        activeKey={activeTab}
        type="card"
        onChange={(key) => setActiveTab(key as TicketPricesTab)}
        items={TAB_ITEMS}
      />

      {activeTab === "u22" ? (
        <U22PriceTab
          config={u22Config.data}
          isLoading={u22Config.isLoading}
          error={u22Config.error}
          onRetry={() => u22Config.refetch()}
        />
      ) : (
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
      )}

      {u22DialogOpen && u22Config.data && (
        <U22PriceEditDialog config={u22Config.data} onClose={() => setU22DialogOpen(false)} />
      )}

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
