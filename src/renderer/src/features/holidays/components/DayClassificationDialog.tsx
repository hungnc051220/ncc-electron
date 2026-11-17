// Popup "Thiết lập ngày" (Danh sách ngày): phân loại từng thứ là Ngày thường / Cuối tuần cho một năm. Ngày lễ
// mặc định chưa đánh dấu được liệt kê để Admin tự chọn (mặc định không chọn): không tự đánh dấu lại ngày Admin
// đã bỏ (vd. đổi ngày nghỉ liền kề 01/09 → 03/09). Đọc cấu hình thực tế từ dữ liệu ngày của năm, chỉ ghi các ngày
// thực sự đổi. Luôn giữ nguyên ngày đặc biệt NCC cấu hình riêng và ngày lễ đã có (kể cả tên).
import { useDateInYear, useReclassifyDays } from "@renderer/hooks/holidays/useDateManagement";
import { PRICING_SCHEMA_NOT_READY_MESSAGE } from "@renderer/api/pricingRules.api";
import { usePricingRules } from "@renderer/hooks/ticketPrices/usePricingRules";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { formatNumber } from "@renderer/lib/utils";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Modal,
  Radio,
  Skeleton,
  Tag,
  theme,
  Tooltip,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { CalendarDays, CircleCheck, Info, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DATE_TAB_LABELS,
  type BaseDateTab,
  findExceptions,
  formatDate,
  formatWeekday,
  getBaseTab,
  inferWeekdayConfig,
  isSameConfig,
  normalizeDateValue,
  planReclassification,
  toMonthDay,
  WEEKDAY_TEMPLATE_LABELS,
  WEEKDAY_TEMPLATES,
  WEEKDAYS,
  type WeekdayConfig
} from "../dateClassification";
import { isRulesReady } from "../datePolicy";
import { getDefaultHolidays } from "../vietnameseHolidays";

const { Text } = Typography;
const EXCEPTION_PREVIEW = 6;

/** Mô tả gọn ngày lễ theo tên lễ: "Tết Nguyên đán (5 ngày), Quốc khánh (2 ngày), Giỗ Tổ Hùng Vương". */
const summarizeHolidays = (holidays: { holidayName: string }[]) => {
  const counts = new Map<string, number>();
  holidays.forEach(({ holidayName }) => {
    const name = holidayName.replace(/\s*\(.*\)$/, "");
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return [...counts]
    .map(([name, count]) => (count > 1 ? `${name} (${count} ngày)` : name))
    .join(", ");
};
const MODAL_WIDTH = "min(920px, calc(100vw - 32px))";
const BASE_OPTIONS: { value: BaseDateTab; label: string }[] = [
  { value: "normal", label: DATE_TAB_LABELS.normal },
  { value: "weekend", label: DATE_TAB_LABELS.weekend }
];
const RULES = [
  <>
    Mỗi thứ trong tuần được phân loại là <strong>Ngày thường</strong> hoặc{" "}
    <strong>Cuối tuần</strong>.
  </>,
  <>
    Thiết lập áp dụng cho <strong>các ngày trong năm đang chọn</strong>.
  </>,
  <>
    <strong>Ngày lễ</strong> được quản lý riêng và luôn ưu tiên hiển thị trong tab Ngày lễ.
  </>,
  <>
    Khi lưu, hệ thống cập nhật phân loại theo cấu hình mới. <strong>Ngày lễ mặc định</strong> (11
    ngày nghỉ lễ theo luật và 6 ngày lễ NCC) còn thiếu chỉ được đánh dấu khi bạn chọn.
  </>,
  <>
    <strong>Ngày đặc biệt</strong> đã cấu hình riêng và ngày lễ đã có (kể cả tên) được giữ nguyên.
  </>
];

type DayClassificationDialogProps = {
  /** Năm đang xem trên Danh sách ngày (mặc định của popup). */
  initialYear: number;
  onClose: () => void;
};

const DayClassificationDialog = ({ initialYear, onClose }: DayClassificationDialogProps) => {
  const { message, modal } = useAntdApp();
  const { token } = theme.useToken();
  const [year, setYear] = useState(initialYear);
  // Bản nháp gắn với năm: đổi năm thì quay về cấu hình thực tế của năm đó.
  const [draft, setDraft] = useState<{ year: number; config: WeekdayConfig } | null>(null);
  const { data: rawDays = [], isFetching, isError, error } = useDateInYear(year);
  const reclassify = useReclassifyDays();
  // Backend V3.2 đủ cấu trúc: ngày lễ mặc định được đánh dấu kèm "Giá vé áp dụng" gợi ý (20/10, 31/10, 20/11
  // theo ngày trong tuần). Backend cũ (rules 404 → `null`): chỉ gửi tên. Chưa biết (đang tải / lỗi → `undefined`)
  // hoặc DB chưa đủ cấu trúc: không đánh dấu, vì backend V3.2 mặc định "Giá ngày lễ" cho ngày lễ mới và gợi ý
  // "Theo giá ngày trong tuần" sẽ bị mất.
  const { data: pricingRules } = usePricingRules();
  const canSavePriceMode = isRulesReady(pricingRules);

  const days = useMemo(
    () => rawDays.map((day) => ({ ...day, dateValue: normalizeDateValue(day.dateValue) })),
    [rawDays]
  );
  const current = useMemo(() => inferWeekdayConfig(days), [days]);
  const config = draft?.year === year ? draft.config : current;
  const activeTemplate = WEEKDAY_TEMPLATES.find((template) =>
    isSameConfig(config, template.config)
  )?.key;
  const exceptions = useMemo(() => findExceptions(days, current), [days, current]);
  // Ngày đặc biệt NCC cấu hình riêng luôn được giữ nguyên (không có tùy chọn ghi đè).
  const plan = useMemo(
    () => planReclassification({ days, current, next: config, keepExceptions: true }),
    [days, current, config]
  );
  // Ngày lễ mặc định chưa phải ngày lễ (ngày đã là lễ giữ tên NCC đặt); chỉ những ngày đã có trong năm.
  // Chỉ đánh dấu những ngày Admin chọn (mặc định không chọn), gắn với năm đang xem.
  const defaultHolidays = useMemo(() => getDefaultHolidays(year), [year]);
  const missingHolidays = useMemo(() => {
    const byDate = new Map(days.map((day) => [day.dateValue, day]));
    return defaultHolidays.filter((holiday) => {
      const day = byDate.get(holiday.dateValue);
      return day !== undefined && !day.isHoliday;
    });
  }, [days, defaultHolidays]);
  // Ngày lễ mặc định không có dòng ngày (năm thiếu một phần): không đánh dấu được ở đây, phải tạo ngày trước (ISS-13).
  const holidaysWithoutRow = useMemo(() => {
    if (days.length === 0) return [];
    const known = new Set(days.map((day) => day.dateValue));
    return defaultHolidays.filter((holiday) => !known.has(holiday.dateValue));
  }, [days, defaultHolidays]);
  const [pickedHolidays, setPickedHolidays] = useState<{ year: number; dates: string[] }>({
    year,
    dates: []
  });
  const pickedDates = pickedHolidays.year === year ? pickedHolidays.dates : [];
  const holidaysToMark = missingHolidays.filter((holiday) =>
    pickedDates.includes(holiday.dateValue)
  );
  const holidayMarkBlockReason =
    pricingRules === undefined
      ? "Chưa tải được cấu hình giá vé từ máy chủ, chưa thể đánh dấu ngày lễ mặc định. Vui lòng thử lại."
      : pricingRules !== null && !canSavePriceMode
        ? `${PRICING_SCHEMA_NOT_READY_MESSAGE} Chưa thể đánh dấu ngày lễ mặc định.`
        : null;
  const isHolidayMarkBlocked = holidaysToMark.length > 0 && holidayMarkBlockReason !== null;
  const changedCount = plan.toNormal.length + plan.toWeekend.length;
  const hasChanges = changedCount + holidaysToMark.length > 0;
  const holidaysTouched = [...plan.toNormal, ...plan.toWeekend].filter((day) => day.isHoliday);
  const isLoading = isFetching && days.length === 0;
  const isEmptyYear = !isFetching && !isError && days.length === 0;
  const canEdit = !isError && !isEmptyYear && !isLoading;

  const setWeekday = (weekday: number, value: BaseDateTab) =>
    setDraft({ year, config: { ...config, [weekday]: value } });
  const applyTemplate = (key: string) => {
    const template = WEEKDAY_TEMPLATES.find((item) => item.key === key);
    if (template) setDraft({ year, config: { ...template.config } });
  };

  const save = () =>
    modal.confirm({
      title: `Lưu thiết lập ngày năm ${year}?`,
      width: 560,
      content: (
        <div className="flex flex-col gap-1">
          {plan.toNormal.length > 0 && (
            <span>{formatNumber(plan.toNormal.length)} ngày chuyển sang Ngày thường.</span>
          )}
          {plan.toWeekend.length > 0 && (
            <span>{formatNumber(plan.toWeekend.length)} ngày chuyển sang Cuối tuần.</span>
          )}
          {holidaysToMark.length > 0 && (
            <span>
              Đánh dấu {formatNumber(holidaysToMark.length)} ngày lễ mặc định:{" "}
              {summarizeHolidays(holidaysToMark)}.
            </span>
          )}
          {plan.keptExceptions.length > 0 && (
            <span>Giữ nguyên {formatNumber(plan.keptExceptions.length)} ngày đặc biệt.</span>
          )}
          {holidaysTouched.length > 0 && (
            <span>
              {formatNumber(holidaysTouched.length)} ngày lễ trong số này vẫn là ngày lễ, giữ nguyên
              tên.
            </span>
          )}
          <Text type="secondary">
            Phân loại mới áp dụng cho các suất chiếu lên lịch sau khi lưu; suất chiếu đã lên lịch
            không thay đổi.
          </Text>
        </div>
      ),
      okText: "Cập nhật",
      cancelText: "Hủy",
      onOk: () =>
        reclassify
          .mutateAsync({
            year,
            toNormal: plan.toNormal.map((day) => toMonthDay(day.dateValue)),
            toWeekend: plan.toWeekend.map((day) => toMonthDay(day.dateValue)),
            holidaysToMark: holidaysToMark.map(({ dateValue, holidayName, applyHolidayPrice }) =>
              canSavePriceMode
                ? { dateValue, holidayName, applyHolidayPrice }
                : { dateValue, holidayName }
            )
          })
          .then(() => {
            message.success(
              `Đã lưu thiết lập ngày năm ${year}: ${formatNumber(changedCount)} ngày đổi phân loại, ${formatNumber(holidaysToMark.length)} ngày lễ mặc định được đánh dấu`
            );
            onClose();
          })
          .catch((saveError: unknown) => {
            message.error(getSafeApiErrorMessage(saveError, "Không lưu được thiết lập ngày"));
          })
    });

  const sectionStyle = {
    borderColor: token.colorBorderSecondary,
    borderRadius: token.borderRadiusLG
  };
  const tintedStyle = {
    ...sectionStyle,
    borderColor: token.colorPrimaryBorder,
    background: token.colorPrimaryBg
  };
  // Chọn nhanh: nền trắng (nền container, theo theme), giữ viền màu chủ đạo.
  const quickPickStyle = { ...tintedStyle, background: token.colorBgContainer };

  const quickPick = (
    <section className="flex flex-col gap-2 border px-4 py-3" style={quickPickStyle}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 font-semibold" style={{ color: token.colorText }}>
          <Zap size={18} style={{ color: token.colorPrimary }} />
          Chọn nhanh
        </span>
        <Text type="secondary" className="text-sm">
          Áp dụng phân loại cho tất cả các thứ, có thể điều chỉnh lại bên dưới.
        </Text>
        {!activeTemplate && canEdit && (
          <Tag color="gold" className="ml-auto">
            Tùy chỉnh
          </Tag>
        )}
      </div>
      <Radio.Group
        name="day-classification-template"
        aria-label="Chọn nhanh"
        className="grid w-full grid-cols-1 gap-3 md:grid-cols-2"
        value={activeTemplate ?? null}
        disabled={!canEdit || reclassify.isPending}
        onChange={(event) => applyTemplate(event.target.value)}
      >
        {WEEKDAY_TEMPLATES.map((template) => {
          const isActive = activeTemplate === template.key;
          return (
            // Cả thẻ bấm được (Radio đã là <label>, không lồng thêm label).
            <div
              key={template.key}
              className="flex min-w-0 cursor-pointer items-center rounded-lg border px-4 py-2 transition-colors"
              style={{
                borderColor: isActive ? token.colorPrimary : token.colorBorder,
                // Đang chọn: màu chủ đạo nhạt (như nền khung Quy tắc).
                background: isActive ? token.colorPrimaryBg : token.colorBgContainer
              }}
              onClick={() => canEdit && !reclassify.isPending && applyTemplate(template.key)}
            >
              <Radio value={template.key} className="whitespace-nowrap">
                {WEEKDAY_TEMPLATE_LABELS[template.key]}
              </Radio>
            </div>
          );
        })}
      </Radio.Group>
    </section>
  );

  // Ngày ngoại lệ: một dòng gọn dưới bảng (danh sách đầy đủ trong tooltip), vừa màn 1366×768.
  const exceptionLabels = exceptions.map(
    (day) =>
      `${formatDate(day.dateValue)} (${formatWeekday(day.dateValue)} · ${DATE_TAB_LABELS[getBaseTab(day)]})`
  );
  const shortDates = (dateValues: string[]) =>
    dateValues
      .slice(0, EXCEPTION_PREVIEW)
      .map((dateValue) => dayjs(dateValue).format("DD/MM"))
      .join(", ") +
    (dateValues.length > EXCEPTION_PREVIEW
      ? ` +${formatNumber(dateValues.length - EXCEPTION_PREVIEW)}`
      : "");
  const exceptionLine = exceptions.length > 0 && (
    <Tooltip title={exceptionLabels.join(", ")}>
      <span className="flex items-center gap-1.5 text-[13px]">
        <Info size={16} style={{ color: token.colorInfo }} />
        <span>
          Năm {year} có {formatNumber(exceptions.length)} ngày đặc biệt (luôn giữ nguyên):{" "}
          <Text type="secondary" className="text-[13px]">
            {shortDates(exceptions.map((day) => day.dateValue))}
          </Text>
        </span>
      </span>
    </Tooltip>
  );
  // Ngày lễ mặc định còn thiếu: Admin tự chọn ngày cần đánh dấu (mặc định không chọn ngày nào).
  const noRowLine = canEdit && holidaysWithoutRow.length > 0 && (
    <span
      className="flex w-full items-center gap-1.5 text-[13px]"
      data-testid="default-holiday-no-row-line"
    >
      <Info size={16} style={{ color: token.colorWarning }} />
      <span>
        {formatNumber(holidaysWithoutRow.length)} ngày lễ mặc định chưa có trong Danh sách ngày (năm
        còn thiếu ngày):{" "}
        <Text type="secondary" className="text-[13px]">
          {shortDates(holidaysWithoutRow.map((holiday) => holiday.dateValue))}
        </Text>
        . Dùng &quot;Tạo các ngày còn thiếu&quot; trên Danh sách ngày.
      </span>
    </span>
  );
  const holidayLine =
    canEdit &&
    (missingHolidays.length === 0 &&
    holidaysWithoutRow.length > 0 ? null : missingHolidays.length === 0 ? (
      <Tooltip
        title={defaultHolidays
          .map((holiday) => `${holiday.holidayName} (${formatDate(holiday.dateValue)})`)
          .join(", ")}
      >
        <span className="flex items-center gap-1.5 text-[13px]" data-testid="default-holiday-line">
          <CalendarDays size={16} style={{ color: token.colorError }} />
          <Text type="secondary" className="text-[13px]">
            Đủ {formatNumber(defaultHolidays.length)} ngày lễ mặc định của năm {year}.
          </Text>
        </span>
      </Tooltip>
    ) : (
      <div className="flex w-full flex-col gap-1 text-[13px]" data-testid="default-holiday-line">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={16} style={{ color: token.colorError }} />
          Năm {year} còn {formatNumber(missingHolidays.length)} ngày lễ mặc định chưa đánh dấu. Chọn
          ngày cần đánh dấu khi lưu:
        </span>
        <Checkbox.Group
          aria-label="Ngày lễ mặc định chưa đánh dấu"
          className="flex flex-wrap gap-x-4 gap-y-1 pl-6"
          value={pickedDates}
          disabled={reclassify.isPending}
          onChange={(values) => setPickedHolidays({ year, dates: values as string[] })}
          options={missingHolidays.map((holiday) => ({
            value: holiday.dateValue,
            label: `${dayjs(holiday.dateValue).format("DD/MM")} · ${holiday.holidayName}`
          }))}
        />
      </div>
    ));

  const weekdayList = (
    <section className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center gap-2 font-semibold" style={{ color: token.colorText }}>
        <CalendarDays size={18} style={{ color: token.colorPrimary }} />
        Phân loại từng thứ
      </span>
      <div className="overflow-hidden border" style={sectionStyle}>
        {WEEKDAYS.map(({ day, label }, index) => (
          <div
            key={day}
            className="grid grid-cols-[minmax(88px,1fr)_auto] items-center gap-3 px-4 py-1.5"
            style={index ? { borderTop: `1px solid ${token.colorBorderSecondary}` } : undefined}
          >
            <span className="flex items-center gap-2">
              <span className="font-semibold">{label}</span>
              {config[day] !== current[day] && <Tag color="gold">Đã đổi</Tag>}
            </span>
            <Radio.Group
              // Tên riêng cho từng thứ: 7 nhóm radio độc lập, không loại trừ nhau trong DOM.
              name={`day-classification-${day}`}
              aria-label={`Phân loại ${label}`}
              className="grid grid-cols-2 gap-6"
              value={config[day]}
              disabled={!canEdit || reclassify.isPending}
              onChange={(event) => setWeekday(day, event.target.value)}
            >
              {BASE_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value} className="whitespace-nowrap">
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {exceptionLine}
        {holidayLine}
        {noRowLine}
      </div>
    </section>
  );

  const rules = (
    <section className="flex flex-col gap-2 border px-4 py-3" style={tintedStyle}>
      <span className="flex items-center gap-2 font-semibold" style={{ color: token.colorText }}>
        <Info size={18} style={{ color: token.colorPrimary }} />
        Quy tắc
      </span>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-snug">
        {RULES.map((rule, index) => (
          <li key={index}>{rule}</li>
        ))}
      </ul>
    </section>
  );

  const summary = !hasChanges ? (
    <span className="flex items-center gap-2">
      <CircleCheck size={18} style={{ color: token.colorSuccess }} />
      <Text type="secondary">
        Chưa có thay đổi
        {plan.keptExceptions.length > 0 &&
          ` (giữ nguyên ${formatNumber(plan.keptExceptions.length)} ngày đặc biệt)`}
        .
      </Text>
    </span>
  ) : (
    <span className="flex items-center gap-2">
      <Info size={18} style={{ color: token.colorWarning }} />
      <Text>
        {changedCount > 0 && (
          <>
            Sẽ cập nhật <strong>{formatNumber(changedCount)}</strong> ngày:{" "}
            {formatNumber(plan.toNormal.length)} ngày sang Ngày thường,{" "}
            {formatNumber(plan.toWeekend.length)} ngày sang Cuối tuần
            {plan.keptExceptions.length > 0 &&
              `; giữ nguyên ${formatNumber(plan.keptExceptions.length)} ngày đặc biệt`}
            {holidaysToMark.length > 0 ? "; " : "."}
          </>
        )}
        {holidaysToMark.length > 0 && (
          <>
            {changedCount > 0 ? "đ" : "Sẽ đ"}ánh dấu{" "}
            <strong>{formatNumber(holidaysToMark.length)}</strong> ngày lễ mặc định.
          </>
        )}
      </Text>
    </span>
  );

  const renderBody = () => {
    if (isError)
      return (
        <Alert
          type="error"
          showIcon
          title="Không tải được dữ liệu ngày"
          description={getSafeApiErrorMessage(error, "Vui lòng thử lại")}
        />
      );
    if (isLoading) return <Skeleton active />;
    if (isEmptyYear)
      return (
        <Alert
          type="warning"
          showIcon
          title={`Năm ${year} chưa có dữ liệu ngày`}
          description="Khởi tạo năm trên Danh sách ngày trước khi thiết lập phân loại."
        />
      );
    return (
      <>
        {quickPick}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {weekdayList}
          <div className="flex flex-col gap-3 lg:pt-8">{rules}</div>
        </div>
        {isHolidayMarkBlocked && (
          <Alert
            type="warning"
            showIcon
            title={holidayMarkBlockReason}
            data-testid="holiday-mark-blocked"
          />
        )}
      </>
    );
  };

  return (
    <Modal
      open
      centered
      width={MODAL_WIDTH}
      title={
        <div className="flex items-start gap-3 pr-6">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
          >
            <CalendarDays size={24} />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold">Thiết lập ngày</span>
            <Text type="secondary" className="text-sm font-normal">
              Phân loại các thứ trong tuần là ngày thường hoặc cuối tuần cho năm áp dụng.
            </Text>
          </span>
        </div>
      }
      onCancel={onClose}
      mask={{ closable: !reclassify.isPending }}
      styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }}
      footer={
        <div
          className="flex flex-wrap items-center justify-between gap-3 pt-3"
          style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}
        >
          <div data-testid="day-classification-summary" className="text-left">
            {canEdit && summary}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={reclassify.isPending}>
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={save}
              loading={reclassify.isPending}
              disabled={!canEdit || !hasChanges || isFetching || isHolidayMarkBlocked}
            >
              Lưu thiết lập
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex items-center gap-3">
          <span>Năm áp dụng</span>
          <DatePicker
            picker="year"
            aria-label="Năm áp dụng"
            className="w-48"
            allowClear={false}
            value={dayjs().year(year)}
            disabled={reclassify.isPending}
            onChange={(value: Dayjs | null) => value && setYear(value.year())}
          />
        </div>
        {renderBody()}
      </div>
    </Modal>
  );
};

export default DayClassificationDialog;
