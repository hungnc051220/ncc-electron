import Icon, { MoreOutlined } from "@ant-design/icons";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useReportRevenueSharing } from "@renderer/hooks/reports/useReportRevenueSharing";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { ReportRevenueSharingProps } from "@shared/types";
import type { TableProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table, message } from "antd";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { exportRevenueSharingExcel } from "./components/ExportExcel";
import Filter from "./components/Filter";
import RevenueSharingDialog from "./components/RevenueSharingDialog";

export interface ValuesProps {
  manufacturerId?: number;
  filmId?: number;
}

const RevenueSharingPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRevenueSharing, setSelectedRevenueSharing] =
    useState<ReportRevenueSharingProps | null>(null);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const { data: revenueSharings, isFetching } = useReportRevenueSharing({
    manufacturerIds: filterValues.manufacturerId ? [filterValues.manufacturerId] : undefined,
    filmIds: filterValues.filmId ? [filterValues.filmId] : undefined
  });
  const { can } = usePermission();
  const canCreate = can("revenue_sharing", "create");
  const canUpdate = can("revenue_sharing", "update");
  const canExport = can("revenue_sharing", "export");

  const handleAdd = useCallback(() => {
    setSelectedRevenueSharing(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: ReportRevenueSharingProps) => {
    setSelectedRevenueSharing(item);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedRevenueSharing(null);
    }
  }, []);

  const handleExport = useCallback(async (item: ReportRevenueSharingProps) => {
    const messageKey = `export-revenue-sharing-${item.filmId}`;

    message.open({
      key: messageKey,
      type: "loading",
      content: "Đang xuất file excel...",
      duration: 0
    });

    try {
      await exportRevenueSharingExcel(item);
      message.open({
        key: messageKey,
        type: "success",
        content: "Xuất file excel thành công"
      });
    } catch (error) {
      message.open({
        key: messageKey,
        type: "error",
        content: getApiErrorMessage(error, "Xuất excel thất bại")
      });
    }
  }, []);

  const actionItems = [
    ...(canUpdate ? [{ key: "1", label: "Cập nhật" }] : []),
    ...(canExport ? [{ key: "2", label: "Xuất excel" }] : [])
  ];

  const groupedRevenueSharings = useMemo(() => {
    if (!revenueSharings) {
      return [];
    }

    const grouped = new Map<number, ReportRevenueSharingProps>();

    revenueSharings.forEach((item) => {
      const existing = grouped.get(item.filmId);

      if (!existing) {
        grouped.set(item.filmId, { ...item });
        return;
      }

      grouped.set(item.filmId, {
        ...existing,
        totalRevenue: existing.totalRevenue + item.totalRevenue,
        sharedRevenue: existing.sharedRevenue + item.sharedRevenue,
        totalTickets: existing.totalTickets + item.totalTickets
      });
    });

    return Array.from(grouped.values());
  }, [revenueSharings]);

  const columns: TableProps<ReportRevenueSharingProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Hãng phim",
      key: "manufacturerName",
      dataIndex: "manufacturerName"
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName"
    },
    {
      title: "Ngày phát hành",
      key: "premierDay",
      dataIndex: "premierDay"
    },
    {
      title: "Doanh thu NCC",
      key: "revenueNCC",
      dataIndex: "revenueNCC",
      render: (_, record) => formatMoney(record.totalRevenue - record.sharedRevenue),
      align: "right"
    },
    {
      title: "Doanh thu chủ phim",
      key: "sharedRevenue",
      dataIndex: "sharedRevenue",
      render: (value: number) => formatMoney(value),
      align: "right"
    },
    {
      title: "Doanh thu",
      key: "totalRevenue",
      dataIndex: "totalRevenue",
      render: (value: number) => formatMoney(value),
      align: "right"
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: ReportRevenueSharingProps) => (
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: (e) => {
                    if (e.key === "1") {
                      handleEdit(record);
                    }
                    if (e.key === "2") {
                      handleExport(record);
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
              title: "Quản lý phân chia doanh thu"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Filter filterValues={filterValues} onSearch={onSearch} />
          {canCreate && (
            <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
              Thêm mới
            </Button>
          )}
        </div>
      </div>

      <Table
        rowKey={(record) => record.filmId}
        dataSource={groupedRevenueSharings}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 265px)" }}
        loading={isFetching}
        pagination={{
          total: groupedRevenueSharings.length,
          size: "middle",
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <RevenueSharingDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingRevenueSharing={selectedRevenueSharing}
        />
      )}
    </div>
  );
};

export default RevenueSharingPage;
