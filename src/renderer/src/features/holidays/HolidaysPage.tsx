// Danh sách ngày: phân loại Ngày thường / Cuối tuần theo dữ liệu thực tế (`DateTypeId`, thiết lập theo thứ bằng
// "Thiết lập phân loại ngày"), Ngày lễ (`IsHoliday`) ưu tiên hiển thị. Màn này không hiển thị giá vé.
import Icon, { MoreOutlined } from "@ant-design/icons";
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
import { Alert, Button, DatePicker, Dropdown, Empty, Select, Tabs, Tag } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { CalendarDays, CalendarPlus, CalendarX2, PlusIcon, SquarePen } from "lucide-react";
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

  const onDayAction = (key: string, day: HolidayProps) => {
    if (key === "mark") setHolidayModal({ mode: "add", dateValue: day.dateValue });
    if (key === "edit")
      setHolidayModal({
        mode: "edit",
        dateValue: day.dateValue,
        holidayName: day.holidayName ?? ""
      });
    if (key === "unmark") confirmUnmark(day);
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
    // Cột thao tác giống các bảng khác: không tiêu đề, nút "⋯" mở menu, ghim bên phải.
    ...(canUpdate
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            align: "center" as const,
            fixed: "right" as const,
            render: (_: unknown, day: HolidayProps) => (
              <Dropdown
                menu={{
                  items: day.isHoliday
                    ? [
                        { key: "edit", icon: <SquarePen size={16} />, label: "Cập nhật" },
                        {
                          key: "unmark",
                          icon: <CalendarX2 size={16} />,
                          label: "Bỏ đánh dấu ngày lễ",
                          danger: true
                        }
                      ]
                    : [
                        { key: "mark", icon: <CalendarPlus size={16} />, label: "Đánh dấu ngày lễ" }
                      ],
                  onClick: ({ key }) => onDayAction(key, day)
                }}
                arrow
                trigger={["click"]}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  aria-label={`Thao tác ngày ${formatDate(day.dateValue)}`}
                />
              </Dropdown>
            )
          }
        ]
      : [])
  ];

  const yearIsEmpty = !isFetching && !isError && normalizedDays.length === 0;
  // Năm thiếu một phần dòng (vd. dòng bị xóa tay): suất chiếu vào ngày thiếu không bán được U22 (ISS-13).
  const daysInSelectedYear = dayjs(`${selectedYear + 1}-01-01`).diff(
    dayjs(`${selectedYear}-01-01`),
    "day"
  );
  const missingDayCount = Math.max(daysInSelectedYear - normalizedDays.length, 0);
  const yearIsPartial = !isFetching && !isError && normalizedDays.length > 0 && missingDayCount > 0;

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

      {yearIsPartial && (
        <Alert
          type="warning"
          showIcon
          data-testid="partial-year-alert"
          title={`Năm ${selectedYear} còn thiếu ${formatNumber(missingDayCount)} ngày trong Danh sách ngày`}
          description="Suất chiếu vào các ngày còn thiếu không áp dụng được ưu đãi U22 và chưa có phân loại ngày. Tạo các ngày còn thiếu để phân loại theo thứ và đánh dấu ngày lễ mặc định; ngày đã có giữ nguyên."
          action={
            canCreate ? (
              <Button size="small" onClick={() => setInitializeOpen(true)}>
                Tạo các ngày còn thiếu
              </Button>
            ) : undefined
          }
        />
      )}

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
        <InitializeYearDialog
          year={selectedYear}
          existingDates={knownDates}
          onClose={() => setInitializeOpen(false)}
        />
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
