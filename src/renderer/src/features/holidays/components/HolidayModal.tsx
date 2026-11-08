// Thêm/sửa ngày lễ (Quản lý ngày V2): một ngày, một tên. Ngày lễ không áp dụng ưu đãi U22.
import { useMarkHoliday } from "@renderer/hooks/holidays/useDateManagement";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { Alert, DatePicker, Form, Input, Modal } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState } from "react";
import { formatDate, formatWeekday } from "../dateClassification";

export const HOLIDAY_NAME_MAX_LENGTH = 200;

export type HolidayModalState =
  | { mode: "add"; dateValue?: string }
  | { mode: "edit"; dateValue: string; holidayName: string };

type HolidayModalProps = {
  state: HolidayModalState;
  year: number;
  /** Ngày đã có trong DateInYear (chỉ những ngày này mới đánh dấu được). */
  knownDates: Set<string>;
  holidayDates: Set<string>;
  screeningDates?: Set<string>;
  onClose: () => void;
  onSaved: (dateValue: string) => void;
};

type FieldType = { date: Dayjs | null; holidayName: string };

const HolidayModal = ({
  state,
  year,
  knownDates,
  holidayDates,
  screeningDates,
  onClose,
  onSaved
}: HolidayModalProps) => {
  const { message } = useAntdApp();
  const [form] = Form.useForm<FieldType>();
  const [serverError, setServerError] = useState<string | null>(null);
  const markHoliday = useMarkHoliday();
  const isEdit = state.mode === "edit";
  const initialName = isEdit ? state.holidayName : "";
  const selectedDate = Form.useWatch("date", form);
  const typedName = Form.useWatch("holidayName", form);
  const selectedValue = selectedDate ? selectedDate.format("YYYY-MM-DD") : undefined;
  const hasScreenings = Boolean(selectedValue && screeningDates?.has(selectedValue));
  const unchanged = isEdit && (typedName ?? "").trim() === initialName.trim();

  const onFinish = (values: FieldType) => {
    if (!values.date) return;
    const dateValue = values.date.format("YYYY-MM-DD");
    setServerError(null);
    markHoliday.mutate(
      { dateValue, holidayName: values.holidayName.trim() },
      {
        onSuccess: () => {
          message.success(
            isEdit ? "Đã cập nhật ngày lễ" : `Đã đánh dấu ${formatDate(dateValue)} là ngày lễ`
          );
          onSaved(dateValue);
        },
        onError: (error) => setServerError(getSafeApiErrorMessage(error, "Không lưu được ngày lễ"))
      }
    );
  };

  return (
    <Modal
      open
      width={460}
      title={isEdit ? "Sửa ngày lễ" : "Thêm ngày lễ"}
      okText="Lưu"
      cancelText="Hủy"
      onOk={() => form.submit()}
      onCancel={markHoliday.isPending ? undefined : onClose}
      confirmLoading={markHoliday.isPending}
      okButtonProps={{ disabled: unchanged }}
      maskClosable={false}
      destroyOnHidden
    >
      <Form<FieldType>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          date: state.dateValue ? dayjs(state.dateValue) : null,
          holidayName: initialName
        }}
      >
        <Form.Item
          label="Ngày"
          name="date"
          rules={[
            { required: true, message: "Chọn ngày lễ" },
            {
              validator: async (_, value: Dayjs | null) => {
                if (!value || isEdit) return;
                const dateValue = value.format("YYYY-MM-DD");
                if (!knownDates.has(dateValue)) {
                  throw new Error(`Ngày chưa có trong năm ${year}. Hãy khởi tạo năm trước.`);
                }
                if (holidayDates.has(dateValue)) throw new Error("Ngày này đã là ngày lễ.");
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
          label="Tên ngày lễ"
          name="holidayName"
          rules={[
            { required: true, whitespace: true, message: "Nhập tên ngày lễ" },
            { max: HOLIDAY_NAME_MAX_LENGTH, message: `Tối đa ${HOLIDAY_NAME_MAX_LENGTH} ký tự` }
          ]}
        >
          <Input
            placeholder="Ví dụ: Quốc khánh"
            maxLength={HOLIDAY_NAME_MAX_LENGTH}
            aria-label="Tên ngày lễ"
          />
        </Form.Item>
      </Form>
      {hasScreenings && !isEdit && (
        <Alert
          type="warning"
          showIcon
          title="Ngày này đã có suất chiếu. Sau khi lưu, vé chưa bán của các suất này không được áp ưu đãi U22."
        />
      )}
      {serverError && <Alert className="mt-3" type="error" showIcon title={serverError} />}
    </Modal>
  );
};

export default HolidayModal;
