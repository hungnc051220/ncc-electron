import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { usePlanScreenings } from "@renderer/hooks/planScreenings/usePlanScreenings";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useUpdatePlanScreening } from "@renderer/hooks/planScreenings/useUpdatePlanScreening";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { PlanScreeningDetailProps } from "@shared/types";
import type { PaginationProps, TableProps, TimeRangePickerProps } from "antd";
import { DatePicker, message, Switch } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] }
];

const OnlineShowtimeBookingPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf("day"));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs().endOf("day"));

  const params = useMemo(
    () => ({
      current,
      pageSize,
      fromDate: fromDate?.startOf("day").format(),
      toDate: toDate?.endOf("day").format()
    }),
    [current, pageSize, fromDate, toDate]
  );

  const { data, isFetching } = usePlanScreenings(params);
  const { can } = usePermission();
  const canUpdate = can("online_showtime_booking", "update");

  const updatePlanScreening = useUpdatePlanScreening();

  const onChangeSellOnline = useCallback(
    (item: PlanScreeningDetailProps) => {
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
            message.success("Cập nhật trạng thái bán online thành công");
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Cập nhật trạng thái bán online thất bại"));
          }
        }
      );
    },
    [updatePlanScreening]
  );

  const columns: TableProps<PlanScreeningDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (value) => dayjs(value).format("DD/MM/YYYY"),
      width: 120
    },
    {
      title: "Ngày chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (value) => dayjs(value).format("HH:mm"),
      width: 100
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, reccord) => reccord.filmInfo.filmName
    },
    {
      title: "Bán online",
      key: "isSellingOnline",
      dataIndex: "isSellingOnline",
      render: (_, record) => {
        return (
          <Switch
            checked={record.isOnlineSelling === 1 ? true : false}
            onChange={() => onChangeSellOnline(record)}
            size="default"
            disabled={!canUpdate || updatePlanScreening.isPending}
          />
        );
      }
    }
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
      <PageHeader left={<AppBreadcrumb />} />

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
    </div>
  );
};

export default OnlineShowtimeBookingPage;
