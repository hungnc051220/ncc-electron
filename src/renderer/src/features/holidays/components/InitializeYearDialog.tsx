// Popup "Khởi tạo năm" (Danh sách ngày): tạo đủ các ngày của năm trong một lệnh, phân loại Ngày thường /
// Cuối tuần theo mẫu (mặc định T2–T5 thường, T6–CN cuối tuần) và đánh dấu các ngày lễ gợi ý được chọn (11 ngày
// nghỉ lễ luật định + 6 ngày lễ NCC). Backend V3.2: mỗi ngày lễ chọn "Giá vé áp dụng" (Giá ngày lễ / Theo ngày
// trong tuần; 20/10, 31/10, 20/11 gợi ý theo ngày trong tuần). Mọi ngày gợi ý đều bỏ chọn được. Ngày đã có trong
// năm không bị đổi.
import { PRICING_SCHEMA_NOT_READY_MESSAGE } from "@renderer/api/pricingRules.api";
import { useInitializeYear } from "@renderer/hooks/holidays/useDateManagement";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { formatNumber } from "@renderer/lib/utils";
import type { PricingRules } from "@shared/types";
import { Alert, Button, Checkbox, Modal, Radio, Select, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { WEEKDAY_TEMPLATE_LABELS, WEEKDAY_TEMPLATES, weekendDaysOf } from "../dateClassification";
import { isRulesReady } from "../datePolicy";
import { getDefaultHolidays } from "../vietnameseHolidays";

const { Text } = Typography;

type InitializeYearDialogProps = {
  year: number;
  /** Ngày (YYYY-MM-DD) đã có của năm: chỉ tạo các ngày còn thiếu, ngày gợi ý chỉ liệt kê trên ngày sẽ tạo. */
  existingDates?: ReadonlySet<string>;
  /**
   * Khả năng của backend. `null`: backend cũ (không có "Giá vé áp dụng", không gửi trường mới); `ready = false`:
   * lỗi tương thích, không cho khởi tạo.
   */
  rules?: PricingRules | null;
  /**
   * Chưa biết khả năng của backend (rules đang tải hoặc lỗi): không khởi tạo, vì backend V3.2 mặc định "Giá ngày lễ"
   * cho ngày lễ gửi thiếu "Giá vé áp dụng" (20/10, 31/10, 20/11 sẽ mất gợi ý "Theo giá ngày trong tuần").
   */
  rulesUnknown?: boolean;
  onClose: () => void;
};

const PRICE_MODE_OPTIONS = [
  { value: "holiday", label: "Giá ngày lễ" },
  { value: "weekday", label: "Theo giá ngày trong tuần" }
];

const daysOfYear = (year: number) => {
  const start = dayjs(`${year}-01-01`);
  return Array.from({ length: start.add(1, "year").diff(start, "day") }, (_, index) =>
    start.add(index, "day")
  );
};

const toggleAllLabel = (allSelected: boolean) => (allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả");

const InitializeYearDialog = ({
  year,
  existingDates,
  rules,
  rulesUnknown = false,
  onClose
}: InitializeYearDialogProps) => {
  const { message } = useAntdApp();
  const initializeYear = useInitializeYear();
  const [templateKey, setTemplateKey] = useState<string>(WEEKDAY_TEMPLATES[0].key);
  const isPartialYear = (existingDates?.size ?? 0) > 0;
  const showPriceMode = Boolean(rules);
  const isSchemaBlocked = Boolean(rules) && !isRulesReady(rules);
  const isBlocked = isSchemaBlocked || rulesUnknown;
  const defaultHolidays = useMemo(
    () => getDefaultHolidays(year).filter((holiday) => !existingDates?.has(holiday.dateValue)),
    [existingDates, year]
  );
  const [selected, setSelected] = useState<string[]>(() =>
    defaultHolidays.map((holiday) => holiday.dateValue)
  );
  const [priceModes, setPriceModes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      defaultHolidays.map((holiday) => [holiday.dateValue, holiday.applyHolidayPrice])
    )
  );
  const days = useMemo(
    () => daysOfYear(year).filter((day) => !existingDates?.has(day.format("YYYY-MM-DD"))),
    [existingDates, year]
  );
  const template =
    WEEKDAY_TEMPLATES.find((item) => item.key === templateKey) ?? WEEKDAY_TEMPLATES[0];
  const weekendDays = weekendDaysOf(template.config);
  const weekendCount = days.filter((item) => weekendDays.includes(item.day())).length;
  const allSelected = defaultHolidays.length > 0 && selected.length === defaultHolidays.length;
  const weekdayPricedCount = selected.filter((dateValue) => priceModes[dateValue] === false).length;

  const submit = () =>
    initializeYear.mutate(
      {
        year,
        weekendDays,
        holidays: defaultHolidays
          .filter((holiday) => selected.includes(holiday.dateValue))
          // Backend cũ không nhận "Giá vé áp dụng": chỉ gửi tên ngày lễ.
          .map(({ dateValue, holidayName }) =>
            showPriceMode
              ? { dateValue, holidayName, applyHolidayPrice: priceModes[dateValue] ?? true }
              : { dateValue, holidayName }
          )
      },
      {
        onSuccess: (result) => {
          if (result.createdDays === 0) message.info(`Năm ${year} đã có đủ ngày, không tạo thêm`);
          else {
            message.success(
              `Đã khởi tạo ${formatNumber(result.createdDays)} ngày cho năm ${year}: ${formatNumber(result.weekendDayCount)} ngày cuối tuần, ${formatNumber(result.holidayCount)} ngày lễ`
            );
          }
          onClose();
        },
        onError: (error) =>
          message.error(getSafeApiErrorMessage(error, `Không khởi tạo được năm ${year}`))
      }
    );

  return (
    <Modal
      open
      centered
      width="min(760px, calc(100vw - 32px))"
      title={isPartialYear ? `Tạo các ngày còn thiếu năm ${year}` : `Khởi tạo năm ${year}`}
      okText="Khởi tạo"
      cancelText="Hủy"
      onOk={submit}
      onCancel={initializeYear.isPending ? undefined : onClose}
      confirmLoading={initializeYear.isPending}
      okButtonProps={{ disabled: isBlocked }}
      cancelButtonProps={{ disabled: initializeYear.isPending }}
      mask={{ closable: false }}
      styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }}
    >
      <div className="flex flex-col gap-4">
        {rulesUnknown && (
          <Alert
            type="warning"
            showIcon
            title="Chưa tải được cấu hình giá vé từ máy chủ"
            description="Chưa khởi tạo được năm vì chưa xác định được giá vé áp dụng của ngày lễ. Vui lòng thử lại."
          />
        )}
        {isSchemaBlocked && (
          <Alert
            type="error"
            showIcon
            title={PRICING_SCHEMA_NOT_READY_MESSAGE}
            description="Chưa khởi tạo được năm vì chưa lưu được giá vé áp dụng của ngày lễ."
          />
        )}
        <section className="flex flex-col gap-2">
          <span className="font-semibold">Phân loại theo thứ</span>
          <Radio.Group
            aria-label="Phân loại theo thứ"
            value={templateKey}
            disabled={initializeYear.isPending}
            onChange={(event) => setTemplateKey(event.target.value)}
            options={WEEKDAY_TEMPLATES.map((item) => ({
              value: item.key,
              label: WEEKDAY_TEMPLATE_LABELS[item.key]
            }))}
          />
        </section>
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">Ngày lễ mặc định</span>
            <Button
              size="small"
              type="link"
              disabled={initializeYear.isPending || defaultHolidays.length === 0}
              onClick={() =>
                setSelected(allSelected ? [] : defaultHolidays.map((holiday) => holiday.dateValue))
              }
            >
              {toggleAllLabel(allSelected)}
            </Button>
          </div>
          <Checkbox.Group
            aria-label="Ngày lễ mặc định"
            className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2"
            value={selected}
            disabled={initializeYear.isPending}
            onChange={(values) => setSelected(values as string[])}
          >
            {defaultHolidays.map((holiday) => {
              const dayLabel = dayjs(holiday.dateValue).format("DD/MM");
              return (
                <div key={holiday.dateValue} className="flex items-center justify-between gap-2">
                  <Checkbox value={holiday.dateValue}>
                    {dayLabel} · {holiday.holidayName}
                  </Checkbox>
                  {showPriceMode && (
                    <Select
                      size="small"
                      className="w-44 shrink-0"
                      aria-label={`Giá vé áp dụng ${dayLabel}`}
                      value={priceModes[holiday.dateValue] === false ? "weekday" : "holiday"}
                      disabled={
                        initializeYear.isPending ||
                        isSchemaBlocked ||
                        !selected.includes(holiday.dateValue)
                      }
                      options={PRICE_MODE_OPTIONS}
                      onChange={(value) =>
                        setPriceModes((current) => ({
                          ...current,
                          [holiday.dateValue]: value === "holiday"
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </Checkbox.Group>
          {defaultHolidays.length === 0 && (
            <Text type="secondary" className="text-[13px]">
              Không có ngày lễ mặc định nào nằm trong các ngày sẽ tạo.
            </Text>
          )}
          <Text type="secondary" className="text-[13px]">
            Gồm 11 ngày nghỉ lễ theo luật (Tết Nguyên đán, Giỗ Tổ tính theo âm lịch Việt Nam) và 6
            ngày lễ NCC (14/02, 08/03, 20/10, 31/10, 20/11, 24/12). Bỏ chọn ngày không áp dụng; ngày
            nghỉ liền kề, nghỉ bù có thể sửa sau trên Danh sách ngày. Mọi ngày lễ không áp dụng ưu
            đãi U22.
            {showPriceMode &&
              " 20/10, 31/10, 20/11 gợi ý giá theo ngày trong tuần (giá ngày thường / cuối tuần theo phân loại gốc)."}
          </Text>
        </section>
        <Text data-testid="initialize-year-summary">
          {isPartialYear && (
            <>Năm đã có {formatNumber(existingDates?.size ?? 0)} ngày (giữ nguyên). </>
          )}
          Tạo <strong>{formatNumber(days.length)}</strong> ngày:{" "}
          {formatNumber(days.length - weekendCount)} ngày thường, {formatNumber(weekendCount)} ngày
          cuối tuần; đánh dấu <strong>{formatNumber(selected.length)}</strong> ngày lễ
          {showPriceMode && weekdayPricedCount > 0 && (
            <> ({formatNumber(weekdayPricedCount)} ngày theo giá trong tuần)</>
          )}
          .
        </Text>
      </div>
    </Modal>
  );
};

export default InitializeYearDialog;
