import Icon, { MoreOutlined } from "@ant-design/icons";
import { useTicketPrices } from "@renderer/hooks/ticketPrices/useTicketPrices";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { TicketPriceProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteTicketPriceDialog from "./components/DeleteTicketPriceDialog";
import TicketPriceDialog from "./components/TicketPriceDialog";
import { Link } from "react-router";

const actionItems = [
  { key: "1", label: "Cập nhật" },
  { key: "2", label: <p className="text-red-500">Xóa</p> }
];

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

  const { data: ticketPrices, isFetching } = useTicketPrices(params);

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
      width: 150
    },
    {
      title: "Loại ghế",
      key: "position",
      dataIndex: "position",
      render: (_, record) => record.position?.name
    },
    {
      title: "Ca chiếu",
      key: "daypart",
      dataIndex: "daypart",
      render: (_, record) => record.daypart?.name
    },
    {
      title: "Giá vé",
      key: "price",
      dataIndex: "price",
      render: (price) => formatMoney(price),
      align: "right",
      width: 200
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
      align: "center",
      fixed: "right"
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
              title: "Danh sách giá vé"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
            Thêm giá vé
          </Button>
        </div>
      </div>

      <Table
        rowKey={(record) => record.id}
        dataSource={ticketPrices?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
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
