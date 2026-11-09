// Danh sách ngày: phân loại Ngày thường / Cuối tuần theo dữ liệu thực tế (`DateTypeId`, thiết lập theo thứ bằng
// "Thiết lập phân loại ngày"), Ngày lễ (`IsHoliday`) ưu tiên hiển thị. Màn này không hiển thị giá vé.
import Icon from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import {
  useDateInYear,
  useScreeningDates,
  useUnmarkHoliday
} from "@renderer/hooks/holidays/useDateManagement";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import type { HolidayProps } from "@shared/types";
import type { TableProps } from "antd";
import { Alert, Button, DatePicker, Empty, Select, Space, Tabs, Tag } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { CalendarDays, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import DayClassificationDialog from "./components/DayClassificationDialog";
import HolidayModal, { type HolidayModalState } from "./components/HolidayModal";
import InitializeYearDialog from "./components/InitializeYearDialog";
import {
  classifyDate,
  DATE_TAB_LABELS,
  type DateTab,
  formatDate,
  formatWeekday,
  getTabAfterUnmark,
  normalizeDateValue
} from "./dateClassification";

const MONTH_OPTIONS = [
  { value: 0, label: "Tất cả các tháng" },
  ...Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: `Tháng ${index + 1}` }))
];

const TABS: DateTab[] = ["normal", "weekend", "holiday"];
const TAB_COLORS: Record<DateTab, string> = { normal: "blue", weekend: "purple", holiday: "red" };

const HolidaysPage = () => {
  const { message, modal } = useAntdApp();
  const [activeTab, setActiveTab] = useState<DateTab>("normal");
  const [year, setYear] = useState<Dayjs>(dayjs());
  const [month, setMonth] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [holidayModal, setHolidayModal] = useState<HolidayModalState | null>(null);
  const [isClassificationOpen, setClassificationOpen] = useState(false);
  const [isInitializeOpen, setInitializeOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const selectedYear = year.year();
  const { data: days = [], isFetching, isError, error, refetch } = useDateInYear(selectedYear);
  const { data: screeningDates } = useScreeningDates(selectedYear);
  const unmarkHoliday = useUnmarkHoliday();
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
    const backTo = DATE_TAB_LABELS[getTabAfterUnmark(day)];
    const hasScreenings = screeningDates?.has(day.dateValue);
    modal.confirm({
      title: `Bỏ đánh dấu ngày lễ ${formatDate(day.dateValue)}?`,
      content: (
        <div className="flex flex-col gap-1">
          <span>
            {day.holidayName ? `"${day.holidayName}" ` : ""}sẽ trở về tab {backTo}. Phân loại nền
            của ngày không đổi.
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
      title: "Phân loại ngày",
      key: "classification",
      render: (_: unknown, day: HolidayProps) => {
        const tab = classifyDate(day);
        return <Tag color={TAB_COLORS[tab]}>{DATE_TAB_LABELS[tab]}</Tag>;
      }
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
              <Button
                // Icon nét của lucide (không bọc antd Icon: Icon tô fill currentColor làm icon bị đặc).
                icon={<CalendarDays size={16} />}
                onClick={() => setClassificationOpen(true)}
              >
                Thiết lập phân loại ngày
              </Button>
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
            <Button type="primary" onClick={() => setInitializeOpen(true)}>
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
          rowClassName={(record) =>
            record.dateValue === highlighted ? "bg-amber-50 dark:bg-amber-400/15" : ""
          }
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

      {isInitializeOpen && (
        <InitializeYearDialog year={selectedYear} onClose={() => setInitializeOpen(false)} />
      )}

      {isClassificationOpen && (
        <DayClassificationDialog
          initialYear={selectedYear}
          onClose={() => setClassificationOpen(false)}
        />
      )}
    </div>
  );
};

export default HolidaysPage;
