// Danh sách ngày (V3.2): ba tab Ngày thường / Cuối tuần theo phân loại gốc thực tế (`DateTypeId`) và Ngày lễ
// (`IsHoliday`, ưu tiên hiển thị). Mỗi ngày lễ tự chọn "Giá vé áp dụng" (Theo giá ngày trong tuần hoặc Giá ngày lễ) và
// vẫn nằm ở tab Ngày lễ; ngày lễ luôn không áp dụng U22. Ngày tắt U22 (`IsPromotionExcluded`) ở tab gốc.
// Không có feature flag: khả năng của backend đọc từ `GET /api/pos/pricing/rules/current`; backend cũ (404) thì ẩn thông
// tin/thao tác mới, DB chưa đủ cấu trúc (`ready = false`) thì báo lỗi tương thích.
import Icon, { MoreOutlined } from "@ant-design/icons";
import { PRICING_SCHEMA_NOT_READY_MESSAGE } from "@renderer/api/pricingRules.api";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import RepricingDialog from "@renderer/features/planCinema/components/repricing/RepricingDialog";
import {
  useDateInYear,
  useScreeningDates,
  useUnmarkHoliday
} from "@renderer/hooks/holidays/useDateManagement";
import { usePricingRules } from "@renderer/hooks/ticketPrices/usePricingRules";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import type { HolidayProps, PricingRules } from "@shared/types";
import type { MenuProps, TableProps } from "antd";
import {
  Alert,
  Button,
  DatePicker,
  Dropdown,
  Empty,
  Select,
  Tabs,
  Tooltip,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  ListChecks,
  PlusIcon,
  ShieldCheck,
  ShieldOff,
  SquarePen
} from "lucide-react";
import { useMemo, useState } from "react";
import DayClassificationDialog from "./components/DayClassificationDialog";
import HolidayModal, {
  type HolidayModalState,
  type HolidaySavedResult
} from "./components/HolidayModal";
import InitializeYearDialog from "./components/InitializeYearDialog";
import PromotionExclusionDialog, {
  type PromotionExclusionAction
} from "./components/PromotionExclusionDialog";
import U22PolicyBadge from "./components/U22PolicyBadge";
import {
  classifyDate,
  DATE_TAB_LABELS,
  type DateTab,
  formatDate,
  formatWeekday,
  getTabAfterUnmark,
  normalizeDateValue
} from "./dateClassification";
import {
  getDayDisplayName,
  getHolidayResultPriceLabel,
  getTicketPriceGroup,
  isRulesReady
} from "./datePolicy";

const { Text } = Typography;

const MONTH_OPTIONS = [
  { value: 0, label: "Tất cả các tháng" },
  ...Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: `Tháng ${index + 1}` }))
];

const TABS: DateTab[] = ["normal", "weekend", "holiday"];

const SCHEMA_PART_LABELS: Record<keyof PricingRules["schema"], string> = {
  holidayPriceMode: "giá vé áp dụng của ngày lễ",
  promotionExclusion: "ưu đãi U22 theo ngày",
  screeningPolicy: "U22 theo từng suất"
};

/**
 * Độ rộng cột cố định, giống nhau ở cả 3 tab (bảng `tableLayout="fixed"`, cuộn ngang khi cửa sổ hẹp).
 * Cột tên (`event`) chỉ có ở tab Ngày lễ.
 */
const COLUMN_WIDTHS = {
  no: 56,
  date: 112,
  weekday: 96,
  event: 240,
  price: 150,
  u22: 150,
  operation: 80
};

const DAY_SAVED_MESSAGE = "Đã cập nhật thiết lập ngày. Giá các suất đã lập không tự thay đổi.";
const PAST_DAY_REPRICING_TOOLTIP = "Ngày đã qua: giá các suất là dữ liệu lịch sử.";

/** Ngày hôm nay theo giờ Việt Nam (`YYYY-MM-DD`). */
const getTodayInVietnam = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

/** Ngày đã qua hoàn toàn (trước hôm nay, giờ Việt Nam): không còn suất nào để đối chiếu. */
const isPastDay = (dateValue: string) => dateValue < getTodayInVietnam();

type MenuItems = NonNullable<MenuProps["items"]>;

const HolidaysPage = () => {
  const { message, modal } = useAntdApp();
  const [activeTab, setActiveTab] = useState<DateTab>("normal");
  const [year, setYear] = useState<Dayjs>(dayjs());
  const [month, setMonth] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [holidayModal, setHolidayModal] = useState<HolidayModalState | null>(null);
  const [promotionDialog, setPromotionDialog] = useState<{
    action: PromotionExclusionAction;
    day: HolidayProps;
  } | null>(null);
  const [repricingDate, setRepricingDate] = useState<Dayjs | null>(null);
  const [isClassificationOpen, setClassificationOpen] = useState(false);
  const [isInitializeOpen, setInitializeOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const selectedYear = year.year();
  const { data: days = [], isFetching, isError, error, refetch } = useDateInYear(selectedYear);
  const { data: screeningDates } = useScreeningDates(selectedYear);
  const { data: rulesData } = usePricingRules();
  // Hiển thị: `undefined` (đang tải / lỗi) và `null` (backend cũ) đều coi là chưa hỗ trợ. Ghi dữ liệu ngày lễ hàng
  // loạt (Khởi tạo năm) thì phân biệt: chưa biết → chặn, backend cũ → chỉ gửi tên.
  const rules = rulesData ?? null;
  const isRulesUnknown = rulesData === undefined;
  const isSchemaBlocked = Boolean(rules) && !isRulesReady(rules);
  const unmarkHoliday = useUnmarkHoliday();
  const { can } = usePermission();
  const canUpdate = can("holidays", "update");
  const canCreate = can("holidays", "create") || canUpdate;
  const canManageExclusion = canUpdate && isRulesReady(rules);
  const canPreviewScreenings = Boolean(rules) && can("plan_cinema", "view");

  const normalizedDays = useMemo(
    () =>
      days
        .map((day) => ({ ...day, dateValue: normalizeDateValue(day.dateValue) }))
        .sort((left, right) => left.dateValue.localeCompare(right.dateValue)),
    [days]
  );
  const daysByDate = useMemo(
    () => new Map(normalizedDays.map((day) => [day.dateValue, day])),
    [normalizedDays]
  );
  const knownDates = useMemo(() => new Set(daysByDate.keys()), [daysByDate]);
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

  /**
   * Thông báo sau khi backend xác nhận đổi thiết lập ngày lễ. Ngày chưa qua có suất đã lập: kèm lối tắt gọn "Đối
   * chiếu giá suất chiếu" (chỉ đọc) khi người dùng có quyền.
   */
  const notifyDaySaved = (dateValue: string, existingScreenings: number) => {
    const showShortcut = existingScreenings > 0 && canPreviewScreenings && !isPastDay(dateValue);
    const key = `day-saved-${dateValue}`;
    message.success({
      key,
      duration: showShortcut ? 6 : 3,
      content: (
        <span>
          {DAY_SAVED_MESSAGE}
          {showShortcut && (
            <Button
              type="link"
              size="small"
              className="h-auto px-1"
              onClick={() => {
                message.destroy(key);
                setRepricingDate(dayjs(dateValue));
              }}
            >
              Đối chiếu giá suất chiếu
            </Button>
          )}
        </span>
      )
    });
  };

  const onHolidaySaved = ({ dateValue, saved, priceChanged }: HolidaySavedResult) => {
    setHolidayModal(null);
    setHighlighted(dateValue);
    changeTab("holiday");
    notifyDaySaved(dateValue, priceChanged ? (saved?.existingScreenings ?? 0) : 0);
  };

  const confirmUnmark = (day: HolidayProps) => {
    const backTo = DATE_TAB_LABELS[getTabAfterUnmark(day)];
    modal.confirm({
      title: `Bỏ đánh dấu ngày lễ ${formatDate(day.dateValue)}?`,
      content: (
        <div className="flex flex-col gap-1">
          <span>
            {day.holidayName ? `"${day.holidayName}" ` : "Ngày "}sẽ trở về tab {backTo}.
          </span>
          <span>
            Giá tra mới theo phân loại gốc:{" "}
            <strong>{getHolidayResultPriceLabel(day, false)}</strong>.
          </span>
          <span>Các suất đã lưu giữ nguyên giá.</span>
          {/* Không khẳng định U22 chắc chắn được áp: còn tùy suất chiếu và khách hàng. */}
          <span>
            {day.isPromotionExcluded === true
              ? "Ưu đãi U22 vẫn không áp dụng vì ngày đang được đánh dấu không áp dụng U22."
              : "Ưu đãi U22 có thể được xét lại, còn tùy suất chiếu và khách hàng."}
          </span>
        </div>
      ),
      okText: "Bỏ đánh dấu",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: () =>
        unmarkHoliday
          .mutateAsync(day.dateValue)
          .then((saved) => {
            // Chỉ ngày đang dùng giá ngày lễ mới đổi giá cấu hình khi bỏ đánh dấu.
            const priceChanged = day.applyHolidayPrice === true;
            notifyDaySaved(day.dateValue, priceChanged ? (saved?.existingScreenings ?? 0) : 0);
          })
          .catch((unmarkError: unknown) => {
            message.error(getSafeApiErrorMessage(unmarkError, "Không bỏ đánh dấu được ngày lễ"));
          })
    });
  };

  const onDayAction = (key: string, day: HolidayProps) => {
    if (key === "mark") setHolidayModal({ mode: "add", dateValue: day.dateValue });
    if (key === "edit") setHolidayModal({ mode: "edit", day });
    if (key === "unmark") confirmUnmark(day);
    if (key === "exclude") setPromotionDialog({ action: "mark", day });
    if (key === "include") setPromotionDialog({ action: "unmark", day });
    if (key === "screenings") setRepricingDate(dayjs(day.dateValue));
  };

  /** Thao tác của một ngày: chỉ những gì backend hỗ trợ, người dùng có quyền và hợp với trạng thái ngày. */
  const getDayMenuItems = (day: HolidayProps): MenuItems => {
    if (day.isHoliday) {
      const isPast = isPastDay(day.dateValue);
      return [
        ...(canUpdate
          ? [{ key: "edit", icon: <SquarePen size={16} />, label: "Chỉnh sửa ngày lễ" }]
          : []),
        ...(canPreviewScreenings
          ? [
              {
                key: "screenings",
                icon: <ListChecks size={16} />,
                disabled: isPast,
                label: isPast ? (
                  <Tooltip title={PAST_DAY_REPRICING_TOOLTIP} placement="left">
                    <span>Đối chiếu giá suất chiếu</span>
                  </Tooltip>
                ) : (
                  "Đối chiếu giá suất chiếu"
                )
              }
            ]
          : []),
        ...(canUpdate
          ? [
              {
                key: "unmark",
                icon: <CalendarX2 size={16} />,
                label: "Bỏ đánh dấu ngày lễ",
                danger: true
              }
            ]
          : [])
      ];
    }
    return [
      ...(canUpdate
        ? [{ key: "mark", icon: <CalendarPlus size={16} />, label: "Thiết lập ngày lễ / sự kiện" }]
        : []),
      ...(canManageExclusion && !day.isPromotionExcluded
        ? [{ key: "exclude", icon: <ShieldOff size={16} />, label: "Không áp dụng U22" }]
        : []),
      ...(canManageExclusion && day.isPromotionExcluded
        ? [{ key: "include", icon: <ShieldCheck size={16} />, label: "Cho phép xét U22" }]
        : [])
    ];
  };

  const showEventColumn = activeTab === "holiday";
  const columns: TableProps<HolidayProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      width: COLUMN_WIDTHS.no,
      render: (_, __, index) => (current - 1) * pageSize + index + 1
    },
    {
      title: "Ngày",
      key: "date",
      dataIndex: "dateValue",
      width: COLUMN_WIDTHS.date,
      render: (value: string) => formatDate(value)
    },
    {
      title: "Thứ",
      key: "weekday",
      dataIndex: "dateValue",
      width: COLUMN_WIDTHS.weekday,
      render: (value: string) => formatWeekday(value)
    },
    // Chỉ ngày lễ có tên (bỏ đánh dấu lễ thì tên bị xóa, không có ghi chú cho ngày thường/cuối tuần):
    // tab Ngày thường / Cuối tuần không hiện cột luôn trống.
    ...(showEventColumn
      ? [
          {
            title: "Tên ngày lễ / sự kiện",
            key: "event",
            width: COLUMN_WIDTHS.event,
            ellipsis: { showTitle: false },
            render: (_: unknown, day: HolidayProps) => {
              const name = getDayDisplayName(day);
              if (!name) return null;
              return (
                <Tooltip title={name} placement="topLeft">
                  <span className="block truncate">{name}</span>
                </Tooltip>
              );
            }
          }
        ]
      : []),
    // Giá vé theo cấu hình của ngày (backend V3.2); backend cũ không xác nhận được nên không hiển thị.
    ...(rules
      ? [
          {
            title: "Giá vé",
            key: "ticketPrice",
            width: COLUMN_WIDTHS.price,
            render: (_: unknown, day: HolidayProps) => {
              const group = getTicketPriceGroup(day);
              if (group.label) return group.label;
              return (
                <Tooltip title={group.note}>
                  <Text type="secondary">—</Text>
                </Tooltip>
              );
            }
          }
        ]
      : []),
    // Backend cũ (rules 404) không trả chính sách U22 theo ngày: không hiện cột (không ghi "Chưa xác định" cho mọi ngày).
    ...(rules
      ? [
          {
            title: "Ưu đãi U22",
            key: "u22",
            width: COLUMN_WIDTHS.u22,
            render: (_: unknown, day: HolidayProps) => <U22PolicyBadge day={day} />
          }
        ]
      : []),
    {
      title: "Thao tác",
      key: "operation",
      width: COLUMN_WIDTHS.operation,
      align: "center" as const,
      fixed: "right" as const,
      render: (_: unknown, day: HolidayProps) => {
        const items = getDayMenuItems(day);
        // Không có thao tác nào (thiếu quyền / máy chủ chưa hỗ trợ): không hiện nút menu rỗng.
        if (items.length === 0) return null;
        return (
          <Dropdown
            menu={{ items, onClick: ({ key }) => onDayAction(key, day) }}
            trigger={["click"]}
            placement="bottomRight"
            getPopupContainer={() => document.body}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              aria-label={`Thao tác ngày ${formatDate(day.dateValue)}`}
            />
          </Dropdown>
        );
      }
    }
  ];
  const tableMinWidth =
    COLUMN_WIDTHS.no +
    COLUMN_WIDTHS.date +
    COLUMN_WIDTHS.weekday +
    (showEventColumn ? COLUMN_WIDTHS.event : 0) +
    (rules ? COLUMN_WIDTHS.price : 0) +
    (rules ? COLUMN_WIDTHS.u22 : 0) +
    COLUMN_WIDTHS.operation;

  const yearIsEmpty = !isFetching && !isError && normalizedDays.length === 0;
  // Năm thiếu một phần dòng (vd. dòng bị xóa tay): suất chiếu vào ngày thiếu không bán được U22 (ISS-13).
  const daysInSelectedYear = dayjs(`${selectedYear + 1}-01-01`).diff(
    dayjs(`${selectedYear}-01-01`),
    "day"
  );
  const missingDayCount = Math.max(daysInSelectedYear - normalizedDays.length, 0);
  const yearIsPartial = !isFetching && !isError && normalizedDays.length > 0 && missingDayCount > 0;
  const missingSchemaParts = rules
    ? (Object.keys(SCHEMA_PART_LABELS) as (keyof PricingRules["schema"])[])
        .filter((part) => !rules.schema[part])
        .map((part) => SCHEMA_PART_LABELS[part])
    : [];

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

      {isSchemaBlocked && (
        <Alert
          type="error"
          showIcon
          data-testid="pricing-schema-alert"
          title={PRICING_SCHEMA_NOT_READY_MESSAGE}
          description={`Thiếu cấu trúc: ${missingSchemaParts.join(", ") || "không xác định"}. Chưa lưu được giá vé áp dụng của ngày lễ và ưu đãi U22 theo ngày, theo suất.`}
        />
      )}

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
          tableLayout="fixed"
          scroll={{ x: tableMinWidth }}
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
          daysByDate={daysByDate}
          screeningDates={screeningDates}
          rules={rules}
          onClose={() => setHolidayModal(null)}
          onSaved={onHolidaySaved}
        />
      )}

      {promotionDialog && (
        <PromotionExclusionDialog
          action={promotionDialog.action}
          day={promotionDialog.day}
          hasScreenings={screeningDates?.has(promotionDialog.day.dateValue)}
          onClose={() => setPromotionDialog(null)}
          onSaved={() => {
            setHighlighted(promotionDialog.day.dateValue);
            setPromotionDialog(null);
          }}
        />
      )}

      {repricingDate && (
        <RepricingDialog open date={repricingDate} onClose={() => setRepricingDate(null)} />
      )}

      {isInitializeOpen && (
        <InitializeYearDialog
          year={selectedYear}
          existingDates={knownDates}
          rules={rules}
          rulesUnknown={isRulesUnknown}
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
