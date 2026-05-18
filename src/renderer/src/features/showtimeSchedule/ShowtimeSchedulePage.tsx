import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { MoreOutlined } from "@ant-design/icons";
import { usePlanCinemas } from "@renderer/hooks/planCinemas/usePlanCinemas";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { PlanCinemaProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { DatePicker, Dropdown } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Check, Eye } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import ShowtimeScheduleDetailDialog from "./components/ShowtimeScheduleDetailDialog";

const actionItems = [{ key: "1", icon: <Eye size={16} />, label: "Xem chi tiết" }];

const { RangePicker } = DatePicker;

const ShowtimeSchedulePage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlanCinemaProps | null>(null);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf("day"));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs().endOf("day"));
  const { can } = usePermission();
  const canView = can("showtime_schedule", "view");

  const params = useMemo(
    () => ({
      current,
      pageSize,
      status: 3,
      fromDate: fromDate?.startOf("day").format(),
      toDate: toDate?.endOf("day").format()
    }),
    [current, pageSize, fromDate, toDate]
  );

  const { data, isFetching, refetch } = usePlanCinemas(params);

  const handleViewDetail = useCallback((item: PlanCinemaProps) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const columns: TableProps<PlanCinemaProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Tên lịch chiếu",
      key: "name",
      dataIndex: "name"
    },
    {
      title: "Ngày lập kế hoạch",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      render: (value) => dayjs(value).format("DD/MM/YYYY")
    },
    {
      title: "Duyệt",
      key: "status",
      dataIndex: "status",
      render: () => <Check className="size-4 text-green-500" />
    },
    ...(canView
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: PlanCinemaProps) => (
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: (e) => {
                    if (e.key === "1") {
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

  const onRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates) {
      setFromDate(dates[0]);
      setToDate(dates[1]);
    }
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
        right={<RefreshButton loading={isFetching} onRefresh={() => refetch()} />}
      />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 z-20">
          <RangePicker
            defaultValue={[fromDate, toDate]}
            format="DD/MM/YYYY"
            onChange={onRangeChange}
            presets={rangePresets}
            allowClear={false}
          />
        </div>
      </div>

      <AutoHeightTable
        rowKey={(record) => record.id}
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

      {dialogOpen && selectedItem && (
        <ShowtimeScheduleDetailDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default ShowtimeSchedulePage;
