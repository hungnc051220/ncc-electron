import { useCreateHoliday } from "@renderer/hooks/holidays/useCreateHoliday";
import type { FormProps } from "antd";
import { Checkbox, Col, DatePicker, Form, message, Modal, Row } from "antd";
import dayjs from "dayjs";

const DAYS_OF_WEEK = [
  { label: "Thứ 2", value: 1 },
  { label: "Thứ 3", value: 2 },
  { label: "Thứ 4", value: 3 },
  { label: "Thứ 5", value: 4 },
  { label: "Thứ 6", value: 5 },
  { label: "Thứ 7", value: 6 },
  { label: "Chủ nhật", value: 0 }
];

const SPECIAL_DAYS = [
  { label: "Ngày 14/2", value: "02-14" },
  { label: "Ngày 8/3", value: "03-08" },
  { label: "Ngày 30/4", value: "04-30" },
  { label: "Ngày 1/5", value: "05-01" },
  { label: "Ngày 2/9", value: "09-02" },
  { label: "Ngày 24/12", value: "12-24" }
];

type FieldType = {
  daysInWeek: string[];
  specialDates: string[];
  specificDate: string | null;
};

interface HolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  dateTypeId: number;
}

const HolidayDialog = ({ open, onOpenChange, dateTypeId, year }: HolidayDialogProps) => {
  const [form] = Form.useForm();

  const createHoliday = useCreateHoliday();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    createHoliday.mutate(
      {
        ...values,
        dateTypeId,
        year,
        specificDate: values.specificDate ? dayjs(values.specificDate).format("MM-DD") : null
      },
      {
        onSuccess: () => {
          message.success(`Cập nhật danh sách ngày thành công`);
          onCancel();
        }
      }
    );
  };

  return (
    <Modal
      open={open}
      title={`Cập nhật ngày ${dateTypeId === 1 ? "thường" : "lễ"} năm ${year}`}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createHoliday.isPending
      }}
      cancelButtonProps={{
        disabled: createHoliday.isPending
      }}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          daysInWeek: [],
          specialDates: [],
          specificDate: null
        }}
      >
        <Form.Item<FieldType> name="daysInWeek" label="Ngày trong tuần">
          <Checkbox.Group style={{ width: "100%" }}>
            <Row>
              {DAYS_OF_WEEK.map((day) => (
                <Col span={8} key={day.value}>
                  <Checkbox value={day.value}>{day.label}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Form.Item>
        <Form.Item<FieldType> name="specialDates" label="Ngày đặc biệt">
          <Checkbox.Group style={{ width: "100%" }}>
            <Row>
              {SPECIAL_DAYS.map((day) => (
                <Col span={8} key={day.value}>
                  <Checkbox value={day.value}>{day.label}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item<FieldType> name="specificDate" label="Ngày cụ thể khác">
          <DatePicker format="DD/MM/YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default HolidayDialog;
