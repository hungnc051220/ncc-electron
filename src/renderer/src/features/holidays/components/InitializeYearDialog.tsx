// Popup "Khởi tạo năm" (Danh sách ngày): tạo đủ các ngày của năm trong một lệnh, phân loại Ngày thường /
// Cuối tuần theo mẫu (mặc định T2–T5 thường, T6–CN cuối tuần) và đánh dấu các ngày lễ mặc định được chọn
// (11 ngày nghỉ lễ luật định + 6 ngày lễ NCC; bỏ chọn được). Ngày đã có trong năm không bị đổi.
import { useInitializeYear } from "@renderer/hooks/holidays/useDateManagement";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { formatNumber } from "@renderer/lib/utils";
import { Button, Checkbox, Modal, Radio, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { WEEKDAY_TEMPLATE_LABELS, WEEKDAY_TEMPLATES, weekendDaysOf } from "../dateClassification";
import { getDefaultHolidays } from "../vietnameseHolidays";

const { Text } = Typography;

type InitializeYearDialogProps = {
  year: number;
  onClose: () => void;
};

const daysOfYear = (year: number) => {
  const start = dayjs(`${year}-01-01`);
  return Array.from({ length: start.add(1, "year").diff(start, "day") }, (_, index) =>
    start.add(index, "day")
  );
};

const InitializeYearDialog = ({ year, onClose }: InitializeYearDialogProps) => {
  const { message } = useAntdApp();
  const initializeYear = useInitializeYear();
  const [templateKey, setTemplateKey] = useState<string>(WEEKDAY_TEMPLATES[0].key);
  const defaultHolidays = useMemo(() => getDefaultHolidays(year), [year]);
  const [selected, setSelected] = useState<string[]>(() =>
    defaultHolidays.map((holiday) => holiday.dateValue)
  );
  const days = useMemo(() => daysOfYear(year), [year]);
  const template =
    WEEKDAY_TEMPLATES.find((item) => item.key === templateKey) ?? WEEKDAY_TEMPLATES[0];
  const weekendDays = weekendDaysOf(template.config);
  const weekendCount = days.filter((item) => weekendDays.includes(item.day())).length;
  const allSelected = selected.length === defaultHolidays.length;

  const submit = () =>
    initializeYear.mutate(
      {
        year,
        weekendDays,
        holidays: defaultHolidays.filter((holiday) => selected.includes(holiday.dateValue))
      },
      {
        onSuccess: (result) => {
          if (result.createdDays === 0) message.info(`Năm ${year} đã có đủ ngày, không tạo thêm`);
          else
            message.success(
              `Đã khởi tạo ${formatNumber(result.createdDays)} ngày cho năm ${year}: ${formatNumber(result.weekendDayCount)} ngày cuối tuần, ${formatNumber(result.holidayCount)} ngày lễ`
            );
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
      title={`Khởi tạo năm ${year}`}
      okText="Khởi tạo"
      cancelText="Hủy"
      onOk={submit}
      onCancel={initializeYear.isPending ? undefined : onClose}
      confirmLoading={initializeYear.isPending}
      cancelButtonProps={{ disabled: initializeYear.isPending }}
      maskClosable={false}
      styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }}
    >
      <div className="flex flex-col gap-4">
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
              disabled={initializeYear.isPending}
              onClick={() =>
                setSelected(allSelected ? [] : defaultHolidays.map((holiday) => holiday.dateValue))
              }
            >
              {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </Button>
          </div>
          <Checkbox.Group
            aria-label="Ngày lễ mặc định"
            className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2"
            value={selected}
            disabled={initializeYear.isPending}
            onChange={(values) => setSelected(values as string[])}
            options={defaultHolidays.map((holiday) => ({
              value: holiday.dateValue,
              label: `${dayjs(holiday.dateValue).format("DD/MM")} · ${holiday.holidayName}`
            }))}
          />
          <Text type="secondary" className="text-[13px]">
            Gồm 11 ngày nghỉ lễ theo luật (Tết Nguyên đán, Giỗ Tổ tính theo âm lịch Việt Nam) và 6
            ngày lễ NCC. Bỏ chọn ngày không áp dụng; ngày nghỉ liền kề, nghỉ bù có thể sửa sau trên
            Danh sách ngày. Ngày lễ không áp dụng ưu đãi U22.
          </Text>
        </section>
        <Text data-testid="initialize-year-summary">
          Tạo <strong>{formatNumber(days.length)}</strong> ngày:{" "}
          {formatNumber(days.length - weekendCount)} ngày thường, {formatNumber(weekendCount)} ngày
          cuối tuần; đánh dấu <strong>{formatNumber(selected.length)}</strong> ngày lễ.
        </Text>
      </div>
    </Modal>
  );
};

export default InitializeYearDialog;
