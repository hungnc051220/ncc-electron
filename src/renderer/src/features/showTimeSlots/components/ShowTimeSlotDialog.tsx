import { useCreateShowTimeSlot } from "@renderer/hooks/showTimeSlots/useCreateShowTimeSlot";
import { useUpdateShowTimeSlot } from "@renderer/hooks/showTimeSlots/useUpdateShowTimeSlot";
import { ApiError, DayPartProps } from "@shared/types";
import type { FormProps } from "antd";
import { Form, Input, message, Modal, Select, TimePicker } from "antd";
import axios from "axios";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

const format = "HH:mm";

type FieldType = {
  dateTypeId: number;
  name: string;
  rangeTime?: [Dayjs, Dayjs];
};

interface ShowTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingShowTimeSlot?: DayPartProps | null;
}

const ShowTimeSlotDialog = ({
  open,
  onOpenChange,
  editingShowTimeSlot
}: ShowTimeSlotDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingShowTimeSlot;

  const createShowTimeSlot = useCreateShowTimeSlot();
  const updateShowTimeSlot = useUpdateShowTimeSlot();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType | undefined => {
    if (!editingShowTimeSlot)
      return {
        dateTypeId: 1,
        name: ""
      };

    return {
      dateTypeId: editingShowTimeSlot.dateTypeId,
      name: editingShowTimeSlot.name,
      rangeTime: [
        dayjs(editingShowTimeSlot.fromTime, "HH:mm"),
        dayjs(editingShowTimeSlot.toTime, "HH:mm")
      ]
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit) {
      createShowTimeSlot.mutate(
        {
          ...values,
          fromTime: values.rangeTime?.[0].format(format),
          toTime: values.rangeTime?.[1].format(format)
        },
        {
          onSuccess: () => {
            message.success("Thêm khung giờ chiếu thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Thêm khung giờ chiếu thất bại";

            if (axios.isAxiosError<ApiError>(error)) {
              msg = error.response?.data?.message ?? msg;
            }

            message.error(msg);
          }
        }
      );
    } else {
      updateShowTimeSlot.mutate(
        {
          id: editingShowTimeSlot.id,
          dto: {
            ...values,
            fromTime: values.rangeTime?.[0].format(format),
            toTime: values.rangeTime?.[1].format(format)
          }
        },
        {
          onSuccess: () => {
            message.success("Cập nhật khung giờ chiếu thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật khung giờ chiếu thất bại";

            if (axios.isAxiosError<ApiError>(error)) {
              msg = error.response?.data?.message ?? msg;
            }

            message.error(msg);
          }
        }
      );
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật khung giờ chiếu" : "Thêm mới khung giờ chiếu"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createShowTimeSlot.isPending || updateShowTimeSlot.isPending
      }}
      cancelButtonProps={{
        disabled: createShowTimeSlot.isPending || updateShowTimeSlot.isPending
      }}
      width={500}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <Form.Item<FieldType>
          name="dateTypeId"
          label="Ngày áp dụng"
          rules={[{ required: true, message: "Chọn ngày áp dụng" }]}
        >
          <Select
            placeholder="Chọn ngày áp dụng"
            options={[
              { label: "Ngày thường", value: 1 },
              { label: "Ngày lễ", value: 2 }
            ]}
          />
        </Form.Item>
        <Form.Item<FieldType>
          name="name"
          label="Tên khung giờ"
          rules={[{ required: true, message: "Chọn tên khung giờ" }]}
        >
          <Input placeholder="Nhập tên khung giờ" />
        </Form.Item>
        <Form.Item<FieldType>
          name="rangeTime"
          label="Khoảng thời gian"
          rules={[{ required: true, message: "Chọn khoảng thời gian" }]}
        >
          <TimePicker.RangePicker format={format} className="w-full" allowClear={false} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ShowTimeSlotDialog;
