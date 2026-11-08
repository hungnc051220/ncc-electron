// Quản lý ngày V2: Ngày thường (T2–T5), Cuối tuần (T6–CN), Ngày lễ (IsHoliday). Ngày lễ không áp U22.
// Loại giá (`DateTypeId`, dùng khi lên lịch suất chiếu) vẫn chỉnh bằng "Cập nhật loại giá ngày" như trước.
import Icon from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import {
  useDateInYear,
  usePopulateYear,
  useScreeningDates,
  useUnmarkHoliday
} from "@renderer/hooks/holidays/useDateManagement";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import type { HolidayProps } from "@shared/types";
import type { TableProps } from "antd";
import { Alert, Button, DatePicker, Dropdown, Empty, Select, Space, Tabs } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { ChevronDown, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import HolidayDialog from "./components/HolidayDialog";
import HolidayModal, { type HolidayModalState } from "./components/HolidayModal";
import {
  classifyDate,
  DATE_TAB_LABELS,
  type DateTab,
  formatDate,
  formatWeekday,
  getTabAfterUnmark,
  normalizeDateValue,
  PRICE_TYPE_LABELS
} from "./dateClassification";

const MONTH_OPTIONS = [
  { value: 0, label: "Tất cả các tháng" },
  ...Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: `Tháng ${index + 1}` }))
];

const TABS: DateTab[] = ["normal", "weekend", "holiday"];

const HolidaysPage = () => {
  const { message, modal } = useAntdApp();
  const [activeTab, setActiveTab] = useState<DateTab>("normal");
  const [year, setYear] = useState<Dayjs>(dayjs());
  const [month, setMonth] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [holidayModal, setHolidayModal] = useState<HolidayModalState | null>(null);
  const [priceTypeDialog, setPriceTypeDialog] = useState<number | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const selectedYear = year.year();
  const { data: days = [], isFetching, isError, error, refetch } = useDateInYear(selectedYear);
  const { data: screeningDates } = useScreeningDates(selectedYear);
  const unmarkHoliday = useUnmarkHoliday();
  const populateYear = usePopulateYear();
  const { can } = usePermission();
  const canUpdate = can("holidays", "update");
  const canCreate = can("holidays", "create") || canUpdate;

  const normalizedDays = useMemo(
    () =>
      days
        .map((day) => ({ ...day, dateValue: normalizeDateValue(day.dateValue) }))
        .sort((left, right) => left.dateValue.localeCompare(right.dateValue)),
    [days]
  );
  const knownDates = useMemo(
    () => new Set(normalizedDays.map((day) => day.dateValue)),
    [normalizedDays]
  );
  const holidayDates = useMemo(
    () => new Set(normalizedDays.filter((day) => day.isHoliday).map((day) => day.dateValue)),
    [normalizedDays]
  );
  const daysOfMonth = useMemo(
    () => normalizedDays.filter((day) => !month || dayjs(day.dateValue).month() + 1 === month),
    [month, normalizedDays]
  );
  const countByTab = useMemo(() => {
    const counts: Record<DateTab, number> = { normal: 0, weekend: 0, holiday: 0 };
    daysOfMonth.forEach((day) => (counts[classifyDate(day)] += 1));
    return counts;
  }, [daysOfMonth]);
  const rows = useMemo(
    () => daysOfMonth.filter((day) => classifyDate(day) === activeTab),
    [activeTab, daysOfMonth]
  );

  const changeTab = (tab: DateTab) => {
    setActiveTab(tab);
    setCurrent(1);
  };

  const confirmUnmark = (day: HolidayProps) => {
    const backTo = DATE_TAB_LABELS[getTabAfterUnmark(day.dateValue)];
    const hasScreenings = screeningDates?.has(day.dateValue);
    modal.confirm({
      title: `Bỏ đánh dấu ngày lễ ${formatDate(day.dateValue)}?`,
      content: (
        <div className="flex flex-col gap-1">
          <span>
            {day.holidayName ? `"${day.holidayName}" ` : ""}sẽ trở về tab {backTo}. Loại giá của
            ngày không đổi.
          </span>
          {hasScreenings && (
            <span className="text-gray-500">
              Vé chưa bán của các suất chiếu ngày này có thể được áp ưu đãi U22 trở lại.
            </span>
          )}
        </div>
      ),
      okText: "Bỏ đánh dấu",
      cancelText: "Hủy",
      onOk: () =>
        unmarkHoliday
          .mutateAsync(day.dateValue)
          .then(() => {
            message.success(`Đã bỏ đánh dấu ngày lễ ${formatDate(day.dateValue)}`);
          })
          .catch((unmarkError: unknown) => {
            message.error(getSafeApiErrorMessage(unmarkError, "Không bỏ đánh dấu được ngày lễ"));
          })
    });
  };

  const initializeYear = () =>
    populateYear.mutate(selectedYear, {
      onSuccess: (created) =>
        message.success(
          `Đã khởi tạo ${formatNumber(created?.length ?? 0)} ngày cho năm ${selectedYear}`
        ),
      onError: (populateError) =>
        message.error(
          getSafeApiErrorMessage(populateError, `Không khởi tạo được năm ${selectedYear}`)
        )
    });

  const columns: TableProps<HolidayProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      width: 60,
      render: (_, __, index) => (current - 1) * pageSize + index + 1
    },
    {
      title: "Ngày",
      key: "date",
      dataIndex: "dateValue",
      width: 140,
      render: (value: string) => formatDate(value)
    },
    {
      title: "Thứ",
      key: "weekday",
      dataIndex: "dateValue",
      width: 120,
      render: (value: string) => formatWeekday(value)
    },
    ...(activeTab === "holiday"
      ? [{ title: "Tên ngày lễ", key: "holidayName", dataIndex: "holidayName" as const }]
      : []),
    {
      title: "Loại giá (lên lịch suất chiếu)",
      key: "dateTypeId",
      dataIndex: "dateTypeId",
      render: (value: number) => PRICE_TYPE_LABELS[value] ?? value
    },
    ...(canUpdate
      ? [
          {
            title: "Thao tác",
            key: "operation",
            width: 220,
            render: (_: unknown, day: HolidayProps) =>
              day.isHoliday ? (
                <Space size={4}>
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      setHolidayModal({
                        mode: "edit",
                        dateValue: day.dateValue,
                        holidayName: day.holidayName ?? ""
                      })
                    }
                  >
                    Sửa
                  </Button>
                  <Button size="small" type="link" danger onClick={() => confirmUnmark(day)}>
                    Bỏ đánh dấu
                  </Button>
                </Space>
              ) : (
                <Button
                  size="small"
                  type="link"
                  onClick={() => setHolidayModal({ mode: "add", dateValue: day.dateValue })}
                >
                  Đánh dấu ngày lễ
                </Button>
              )
          }
        ]
      : [])
  ];

  const yearIsEmpty = !isFetching && !isError && normalizedDays.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
            {canUpdate && (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    { key: "1", label: `Đặt "${PRICE_TYPE_LABELS[1]}"` },
                    { key: "2", label: `Đặt "${PRICE_TYPE_LABELS[2]}"` }
                  ],
                  onClick: ({ key }) => setPriceTypeDialog(Number(key))
                }}
              >
                <Button>
                  Cập nhật loại giá ngày <ChevronDown size={14} />
                </Button>
              </Dropdown>
            )}
            {canUpdate && (
              <Button
                type="primary"
                icon={<Icon component={PlusIcon} />}
                onClick={() => setHolidayModal({ mode: "add" })}
                disabled={yearIsEmpty}
              >
                Thêm ngày lễ
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <DatePicker
          picker="year"
          value={year}
          allowClear={false}
          aria-label="Năm"
          onChange={(value) => {
            if (!value) return;
            setYear(value);
            setCurrent(1);
          }}
        />
        <Select
          className="w-44"
          value={month}
          options={MONTH_OPTIONS}
          aria-label="Tháng"
          onChange={(value) => {
            setMonth(value);
            setCurrent(1);
          }}
        />
      </div>

      <Tabs
        activeKey={activeTab}
        type="card"
        onChange={(key) => changeTab(key as DateTab)}
        items={TABS.map((tab) => ({
          key: tab,
          label: `${DATE_TAB_LABELS[tab]} (${countByTab[tab]})`
        }))}
      />

      {isError ? (
        <Alert
          type="error"
          showIcon
          title="Không tải được danh sách ngày"
          description={getSafeApiErrorMessage(error, "Vui lòng thử lại")}
          action={
            <Button size="small" onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : yearIsEmpty ? (
        <Empty description={`Năm ${selectedYear} chưa có dữ liệu ngày`}>
          {canCreate && (
            <Button type="primary" loading={populateYear.isPending} onClick={initializeYear}>
              Khởi tạo năm {selectedYear}
            </Button>
          )}
        </Empty>
      ) : (
        <AutoHeightTable
          rowKey={(record) => record.dateValue}
          dataSource={rows}
          columns={columns}
          bordered
          size="small"
          loading={isFetching}
          rowClassName={(record) => (record.dateValue === highlighted ? "bg-amber-50" : "")}
          pagination={{
            current,
            pageSize,
            total: rows.length,
            size: "middle",
            pageSizeOptions: [20, 50, 100],
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrent(page);
              setPageSize(size);
            },
            showTotal: (total) => `Tổng ${formatNumber(total)} ngày`
          }}
        />
      )}

      {holidayModal && (
        <HolidayModal
          state={holidayModal}
          year={selectedYear}
          knownDates={knownDates}
          holidayDates={holidayDates}
          screeningDates={screeningDates}
          onClose={() => setHolidayModal(null)}
          onSaved={(dateValue) => {
            setHolidayModal(null);
            setHighlighted(dateValue);
            changeTab("holiday");
          }}
        />
      )}

      {priceTypeDialog !== null && (
        <HolidayDialog
          open
          onOpenChange={(open) => {
            if (!open) setPriceTypeDialog(null);
          }}
          year={selectedYear}
          dateTypeId={priceTypeDialog}
        />
      )}
    </div>
  );
};

export default HolidaysPage;
