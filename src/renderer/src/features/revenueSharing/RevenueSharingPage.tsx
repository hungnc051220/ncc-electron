import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useReportRevenueSharing } from "@renderer/hooks/reports/useReportRevenueSharing";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { ReportRevenueSharingProps } from "@shared/types";
import type { TableProps } from "antd";
import { Button, Dropdown, Table, message } from "antd";
import { DownloadIcon, FileSpreadsheet, PlusIcon, SquarePen } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { exportRevenueSharingExcel } from "./components/ExportExcel";
import { exportRevenueSharingListExcel } from "./components/ExportListExcel";
import Filter from "./components/Filter";
import RevenueSharingDialog from "./components/RevenueSharingDialog";
import dayjs from "dayjs";

export interface ValuesProps {
  manufacturerId?: number;
  filmId?: number;
  dateRange?: [string, string];
}

const RevenueSharingPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRevenueSharing, setSelectedRevenueSharing] =
    useState<ReportRevenueSharingProps | null>(null);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (filtered.manufacturerId) {
      filtered.manufacturerIds = [filtered.manufacturerId];
      delete filtered.manufacturerId;
    }

    if (filtered.filmId) {
      filtered.filmIds = [filtered.filmId];
      delete filtered.filmId;
    }

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").toISOString();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").toISOString();
    }

    return filtered;
  }, [filterValues]);

  const { data: revenueSharings, isFetching } = useReportRevenueSharing(params);

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

  const handleExport = useCallback(
    async (item: ReportRevenueSharingProps) => {
      const messageKey = `export-revenue-sharing-${item.filmId}`;
      const [fromDate, toDate] = filterValues.dateRange ?? [];

      message.open({
        key: messageKey,
        type: "loading",
        content: "Đang xuất file excel...",
        duration: 0
      });

      try {
        const result = await exportRevenueSharingExcel({
          ...item,
          fromDate: fromDate ? dayjs(fromDate).format("YYYY-MM-DD") : undefined,
          toDate: toDate ? dayjs(toDate).format("YYYY-MM-DD") : undefined
        });

        if (result.canceled) {
          message.open({
            key: messageKey,
            type: "warning",
            content: "Bạn đã hủy lưu file excel"
          });
          return;
        }

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
    },
    [filterValues.dateRange]
  );

  const actionItems = [
    ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canExport ? [{ key: "2", icon: <FileSpreadsheet size={16} />, label: "Xuất excel" }] : [])
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

  const revenueSummary = useMemo(() => {
    return groupedRevenueSharings.reduce(
      (totals, item) => {
        totals.totalRevenueNCC += item.totalRevenue - item.sharedRevenue;
        totals.totalSharedRevenue += item.sharedRevenue;
        totals.allRevenue += item.totalRevenue;
        return totals;
      },
      {
        totalRevenueNCC: 0,
        totalSharedRevenue: 0,
        allRevenue: 0
      }
    );
  }, [groupedRevenueSharings]);

  const hasRevenueSharingData = groupedRevenueSharings.length > 0;

  const handleExportList = useCallback(async () => {
    const messageKey = "export-revenue-sharing-list";
    const [fromDate, toDate] = filterValues.dateRange ?? [];

    message.open({
      key: messageKey,
      type: "loading",
      content: "Đang xuất file excel...",
      duration: 0
    });

    try {
      const result = await exportRevenueSharingListExcel({
        data: groupedRevenueSharings,
        summary: revenueSummary,
        fromDate,
        toDate
      });

      if (result.canceled) {
        message.open({
          key: messageKey,
          type: "warning",
          content: "Bạn đã hủy lưu file excel"
        });
        return;
      }

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
  }, [filterValues.dateRange, groupedRevenueSharings, revenueSummary]);

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
      key: "premieredDay",
      dataIndex: "premieredDay",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY")
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
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <Filter filterValues={filterValues} onSearch={onSearch} />
            {canExport && (
              <Button
                variant="solid"
                color="green"
                disabled={!hasRevenueSharingData}
                onClick={handleExportList}
                icon={<Icon component={DownloadIcon} />}
              >
                Xuất excel
              </Button>
            )}
            {canCreate && (
              <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
                Thêm mới
              </Button>
            )}
          </>
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.filmId}
        dataSource={groupedRevenueSharings}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          pageSize: 20,
          total: groupedRevenueSharings.length,
          size: "middle",
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
        summary={() => {
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4} align="center" className="font-bold">
                Tổng
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right" index={4} className="font-bold">
                {formatMoney(revenueSummary.totalRevenueNCC)}
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right" index={5} className="font-bold">
                {formatMoney(revenueSummary.totalSharedRevenue)}
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right" index={6} className="font-bold">
                {formatMoney(revenueSummary.allRevenue)}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
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
