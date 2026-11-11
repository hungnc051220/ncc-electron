// "Thiết lập ngày lễ / sự kiện" (đánh dấu ngày chưa là lễ) và "Chỉnh sửa ngày lễ" (contract V3.2 mục 5.2): tên ngày
// lễ / sự kiện và "Giá vé áp dụng" (Giá ngày lễ hoặc Theo giá ngày trong tuần), kèm box "Kết quả thiết lập". Ngày
// lễ luôn không áp dụng ưu đãi U22, dù chọn giá nào; phân loại gốc giữ nguyên; các suất đã lập giữ giá đã lưu.
import { PRICING_SCHEMA_NOT_READY_MESSAGE } from "@renderer/api/pricingRules.api";
import { useMarkHoliday } from "@renderer/hooks/holidays/useDateManagement";
import { getApiErrorCode, getSafeApiErrorMessage } from "@renderer/lib/apiError";
import type { HolidayProps, PricingRules } from "@shared/types";
import { Alert, DatePicker, Form, Input, Modal, Radio, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState } from "react";
import { formatWeekday } from "../dateClassification";
import { getHolidayResultPriceLabel, isRulesReady } from "../datePolicy";

const { Text } = Typography;

export const HOLIDAY_NAME_MAX_LENGTH = 200;

const PRICE_MODE_ERROR_CODES = [
  "HOLIDAY_PRICE_MODE_SCHEMA_MISSING",
  "HOLIDAY_PRICE_MODE_UNAVAILABLE"
];

/** Thứ tự hiển thị: "Giá ngày lễ" trước (mặc định khi thiết lập mới), "Theo giá ngày trong tuần" sau. */
const PRICE_MODE_OPTIONS = [
  { value: true, label: "Giá ngày lễ" },
  { value: false, label: "Theo giá ngày trong tuần" }
];

export type HolidayModalState =
  | { mode: "add"; dateValue?: string }
  | { mode: "edit"; day: HolidayProps };

export type HolidaySavedResult = {
  dateValue: string;
  saved: HolidayProps;
  /** Ngày mới đánh dấu lễ, hoặc đổi "Giá vé áp dụng": giá cấu hình của ngày đổi. */
  priceChanged: boolean;
};

type HolidayModalProps = {
  state: HolidayModalState;
  year: number;
  /** Các ngày đã có trong DateInYear (chỉ những ngày này mới đánh dấu được). */
  daysByDate: ReadonlyMap<string, HolidayProps>;
  screeningDates?: Set<string>;
  /** `null`: backend cũ (ẩn "Giá vé áp dụng"); `ready = false`: lỗi tương thích, không lưu chế độ giá. */
  rules?: PricingRules | null;
  onClose: () => void;
  /** Gọi sau khi backend xác nhận lưu thành công; trang hiển thị thông báo. */
  onSaved: (result: HolidaySavedResult) => void;
};

type FieldType = { date: Dayjs | null; holidayName: string; applyHolidayPrice?: boolean };

/** Lỗi khi lưu: lỗi cấu trúc DB của chế độ giá được báo là lỗi tương thích, không báo thành công. */
export const getHolidaySaveErrorMessage = (error: unknown) =>
  PRICE_MODE_ERROR_CODES.includes(getApiErrorCode(error) ?? "")
    ? `${PRICING_SCHEMA_NOT_READY_MESSAGE} Ngày lễ chưa được lưu.`
    : getSafeApiErrorMessage(error, "Không lưu được thiết lập ngày");

const HolidayModal = ({
  state,
  year,
  daysByDate,
  screeningDates,
  rules,
  onClose,
  onSaved
}: HolidayModalProps) => {
  const [form] = Form.useForm<FieldType>();
  const [serverError, setServerError] = useState<string | null>(null);
  const markHoliday = useMarkHoliday();
  const isEdit = state.mode === "edit";
  const editedDay = isEdit ? state.day : null;
  const initialName = editedDay?.holidayName ?? "";
  const initialDateValue =
    editedDay?.dateValue ?? (state.mode === "add" ? state.dateValue : undefined);
  // Thiết lập mới: mặc định "Giá ngày lễ". Chỉnh sửa: đúng giá trị đã lưu (chỉ đổi tên vẫn gửi lại đúng giá trị
  // đó); không đọc được (null) thì để trống và bắt buộc chọn, không đoán.
  const initialPriceMode = editedDay ? (editedDay.applyHolidayPrice ?? undefined) : true;
  // Backend V3.2: luôn hiện "Giá vé áp dụng"; chỉ gửi khi DB có đủ cấu trúc. Backend cũ: ẩn, không gửi.
  const showPriceMode = Boolean(rules);
  const canSavePriceMode = isRulesReady(rules);
  const selectedDate = Form.useWatch("date", form);
  const typedName = Form.useWatch("holidayName", form);
  const selectedPriceMode = Form.useWatch("applyHolidayPrice", form);
  const selectedValue = selectedDate ? selectedDate.format("YYYY-MM-DD") : undefined;
  const selectedDay = editedDay ?? (selectedValue ? daysByDate.get(selectedValue) : undefined);
  const hasScreenings = Boolean(!isEdit && selectedValue && screeningDates?.has(selectedValue));
  const priceModeChanged =
    canSavePriceMode && isEdit && selectedPriceMode !== (editedDay?.applyHolidayPrice ?? undefined);
  const unchanged =
    isEdit && (typedName ?? "").trim() === initialName.trim() && !priceModeChanged;
  const resultPrice =
    selectedDay && typeof selectedPriceMode === "boolean"
      ? getHolidayResultPriceLabel(selectedDay, selectedPriceMode)
      : "—";

  const onFinish = (values: FieldType) => {
    // Chống gửi trùng khi đang lưu.
    if (!values.date || markHoliday.isPending) return;
    const dateValue = values.date.format("YYYY-MM-DD");
    const sendsPriceMode = canSavePriceMode && typeof values.applyHolidayPrice === "boolean";
    setServerError(null);
    markHoliday.mutate(
      {
        dateValue,
        holidayName: values.holidayName.trim(),
        ...(sendsPriceMode ? { applyHolidayPrice: values.applyHolidayPrice } : {})
      },
      {
        onSuccess: (saved) =>
          onSaved({ dateValue, saved, priceChanged: !isEdit || priceModeChanged }),
        onError: (error) => setServerError(getHolidaySaveErrorMessage(error))
      }
    );
  };

  return (
    <Modal
      open
      width={500}
      title={isEdit ? "Chỉnh sửa ngày lễ" : "Thiết lập ngày lễ / sự kiện"}
      okText="Lưu thiết lập"
      cancelText="Hủy"
      onOk={() => form.submit()}
      onCancel={markHoliday.isPending ? undefined : onClose}
      confirmLoading={markHoliday.isPending}
      okButtonProps={{ disabled: unchanged }}
      cancelButtonProps={{ disabled: markHoliday.isPending }}
      mask={{ closable: false }}
      destroyOnHidden
    >
      <Form<FieldType>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          date: initialDateValue ? dayjs(initialDateValue) : null,
          holidayName: initialName,
          applyHolidayPrice: initialPriceMode
        }}
      >
        <Form.Item
          label="Ngày"
          name="date"
          rules={[
            { required: true, message: "Chọn ngày" },
            {
              validator: async (_, value: Dayjs | null) => {
                if (!value || isEdit) return;
                const day = daysByDate.get(value.format("YYYY-MM-DD"));
                if (!day) throw new Error(`Ngày chưa có trong năm ${year}. Hãy khởi tạo năm trước.`);
                if (day.isHoliday) throw new Error("Ngày này đã là ngày lễ.");
              }
            }
          ]}
          extra={selectedValue ? formatWeekday(selectedValue) : undefined}
        >
          <DatePicker
            className="w-full"
            format="DD/MM/YYYY"
            disabled={isEdit}
            aria-label="Ngày lễ"
            disabledDate={(current) => current.year() !== year}
            defaultPickerValue={dayjs(`${year}-01-01`)}
          />
        </Form.Item>
        <Form.Item
          label="Tên ngày lễ / sự kiện"
          name="holidayName"
          rules={[
            { required: true, whitespace: true, message: "Nhập tên ngày lễ hoặc sự kiện" },
            { max: HOLIDAY_NAME_MAX_LENGTH, message: `Tối đa ${HOLIDAY_NAME_MAX_LENGTH} ký tự` }
          ]}
        >
          <Input
            placeholder="Nhập tên ngày lễ hoặc sự kiện"
            maxLength={HOLIDAY_NAME_MAX_LENGTH}
            aria-label="Tên ngày lễ"
          />
        </Form.Item>
        {showPriceMode && (
          <Form.Item
            label="Giá vé áp dụng"
            name="applyHolidayPrice"
            className="mb-3"
            rules={
              canSavePriceMode ? [{ required: true, message: "Chọn giá vé áp dụng" }] : undefined
            }
          >
            <Radio.Group
              aria-label="Giá vé áp dụng"
              disabled={!canSavePriceMode}
              options={PRICE_MODE_OPTIONS}
            />
          </Form.Item>
        )}
      </Form>
      {showPriceMode && !canSavePriceMode && (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          title={PRICING_SCHEMA_NOT_READY_MESSAGE}
          description="Chưa lưu được giá vé áp dụng; chỉ đổi được tên ngày lễ."
        />
      )}
      <div
        className="flex flex-col gap-0.5 rounded-md border border-(--ant-color-border-secondary) bg-(--ant-color-fill-quaternary) px-3 py-2 text-[13px]"
        data-testid="holiday-result-box"
      >
        <Text strong className="text-[13px]">
          Kết quả thiết lập
        </Text>
        {canSavePriceMode && (
          <span>
            Giá vé: <Text strong>{resultPrice}</Text>
          </span>
        )}
        <span>
          Ưu đãi U22: <Text strong>Không áp dụng</Text>
        </span>
      </div>
      <Text type="secondary" className="mt-1 block text-xs">
        Các suất chiếu đã lập giữ nguyên giá hiện tại.
      </Text>
      {hasScreenings && (
        <Text type="warning" className="mt-1 block text-xs">
          Ngày này đã có suất chiếu. Sau khi lưu, vé chưa bán của các suất này không được áp ưu đãi
          U22.
        </Text>
      )}
      {serverError && <Alert className="mt-3" type="error" showIcon title={serverError} />}
    </Modal>
  );
};

export default HolidayModal;
