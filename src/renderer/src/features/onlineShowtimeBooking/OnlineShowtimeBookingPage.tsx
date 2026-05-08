import { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { usePlanScreenings } from "@renderer/hooks/planScreenings/usePlanScreenings";
import { useUpdatePlanScreening } from "@renderer/hooks/planScreenings/useUpdatePlanScreening";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import {
  formatNumber,
  getPlanScreeningDateTime,
  isPlanScreeningLocked,
  compareText,
  compareNumber
} from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { PlanScreeningDetailProps } from "@shared/types";
import type { MenuProps, PaginationProps, TableProps } from "antd";
import { Dropdown } from "antd";
import dayjs from "dayjs";
import { Check, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import Filter, { OnlineShowtimeBookingFilterValues } from "./Filter";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

const OnlineShowtimeBookingPage = () => {
  const { message } = useAntdApp();

  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<OnlineShowtimeBookingFilterValues>({
    dateRange: [dayjs().startOf("day"), dayjs().endOf("day")]
  });

  const params = useMemo(
    () => ({
      current,
      pageSize,
      fromDate: filterValues.dateRange?.[0]?.startOf("day").format(),
      toDate: filterValues.dateRange?.[1]?.endOf("day").format()
    }),
    [current, pageSize, filterValues]
  );

  const { data, isFetching } = usePlanScreenings(params);
  const { can } = usePermission();
  const canUpdate = can("online_showtime_booking", "update");
  const updatePlanScreening = useUpdatePlanScreening();

  const getScreeningDateTime = useCallback(
    (item: PlanScreeningDetailProps) =>
      getPlanScreeningDateTime(item.projectDate, item.projectTime)?.valueOf() ?? 0,
    []
  );

  const isPastShowtime = useCallback(
    (item: PlanScreeningDetailProps) => isPlanScreeningLocked(item.projectDate, item.projectTime),
    []
  );

  const handleToggleOnlineSelling = useCallback(
    (item: PlanScreeningDetailProps) => {
      if (isPastShowtime(item)) {
        message.warning("Ca chiếu đã quá suất chiếu, không thể thao tác");
        return;
      }

      updatePlanScreening.mutate(
        {
          id: item.id,
          dto: {
            ...item,
            isOnlineSelling: item.isOnlineSelling === 1 ? 0 : 1
          }
        },
        {
          onSuccess: () => {
            message.success(
              item.isOnlineSelling === 1 ? "Tắt bán online thành công" : "Bật bán online thành công"
            );
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Cập nhật trạng thái bán online thất bại"));
          }
        }
      );
    },
    [isPastShowtime, message, updatePlanScreening]
  );

  const getActionItems = useCallback(
    (item: PlanScreeningDetailProps): MenuProps["items"] =>
      canUpdate
        ? [
            {
              key: "toggle-online",
              label: item.isOnlineSelling === 1 ? "Tắt bán online" : "Bật bán online",
              disabled: isPastShowtime(item) || updatePlanScreening.isPending
            }
          ]
        : [],
    [canUpdate, isPastShowtime, updatePlanScreening.isPending]
  );

  const columns: TableProps<PlanScreeningDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50
    },
    {
      title: "Tên phim",
      key: "filmName",
      render: (_, record) => record.filmInfo?.filmName || "",
      sorter: (a, b) => compareText(a.filmInfo?.filmName, b.filmInfo?.filmName)
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      sorter: (a, b) => compareNumber(getScreeningDateTime(a), getScreeningDateTime(b)),
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      width: 150
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      sorter: (a, b) => compareNumber(getScreeningDateTime(a), getScreeningDateTime(b)),
      render: (value: string) => dayjs(value).format("HH:mm"),
      width: 150
    },
    {
      title: "Phòng",
      key: "roomName",
      render: (_, record) => record.roomInfo?.name || "",
      sorter: (a, b) => compareText(a.roomInfo?.name, b.roomInfo?.name),
      width: 100
    },

    {
      title: "Bán online",
      key: "isOnlineSelling",
      dataIndex: "isOnlineSelling",
      sorter: (a, b) => Number(a.isOnlineSelling) - Number(b.isOnlineSelling),
      render: (_: unknown, record: PlanScreeningDetailProps) => (
        <div className="flex items-center justify-center">
          {record.isOnlineSelling === 1 ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <X className="size-4 text-red-500" />
          )}
        </div>
      ),
      align: "center",
      width: 130
    },
    {
      title: "",
      key: "operation",
      width: 50,
      render: (_: unknown, record: PlanScreeningDetailProps) => (
        <Dropdown
          menu={{
            items: getActionItems(record),
            onClick: (e) => {
              if (e.key === "toggle-online") {
                handleToggleOnlineSelling(record);
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

  const onSearch = (values: OnlineShowtimeBookingFilterValues) => {
    setFilterValues(values);
  };

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (page, size) => {
    setCurrent(page);
    setPageSize(size);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={<Filter onSearch={onSearch} filterValues={filterValues} setCurrent={setCurrent} />}
      />

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
    </div>
  );
};

export default OnlineShowtimeBookingPage;
