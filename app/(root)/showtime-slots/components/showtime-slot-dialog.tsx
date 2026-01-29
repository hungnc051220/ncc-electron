"use client";

import { DayPartProps } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Form, Input, Modal, Select } from "antd";
import axios from "axios";
import { toast } from "sonner";
import { TimePicker } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const format = "HH:mm";

type FieldType = {
  dateTypeId: number;
  name: string;
  rangeTime?: [Dayjs, Dayjs];
};

interface ShowtimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingShowtimeSlot?: DayPartProps | null;
}

const ShowtimeSlotDialog = ({
  open,
  onOpenChange,
  editingShowtimeSlot,
}: ShowtimeSlotDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!editingShowtimeSlot;

  const showtimeSlotsMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/showtime-slots/create", {
          dateTypeId: data.dateTypeId,
          name: data.name,
          fromTime: data.rangeTime?.[0].format(format),
          toTime: data.rangeTime?.[1].format(format),
        });
      } else {
        return axios.post("/api/showtime-slots/update", {
          ...data,
          id: editingShowtimeSlot.id,
          fromTime: data.rangeTime?.[0].format(format),
          toTime: data.rangeTime?.[1].format(format),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showtime-slots"] });
      toast.success(
        `${isEdit ? "Cập nhật" : "Thêm"} khung giờ chiếu thành công`,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!editingShowtimeSlot)
      return {
        dateTypeId: 1,
        name: "",
      };

    return {
      dateTypeId: editingShowtimeSlot.dateTypeId,
      name: editingShowtimeSlot.name,
      rangeTime: [
        dayjs(editingShowtimeSlot.fromTime, "HH:mm"),
        dayjs(editingShowtimeSlot.toTime, "HH:mm"),
      ],
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    console.log(values);
    showtimeSlotsMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật khung giờ chiếu" : "Thêm mới khung giờ chiếu"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: showtimeSlotsMutation.isPending,
      }}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={getInitialValues()}
      >
        <Form.Item<FieldType>
          name="dateTypeId"
          label="Ngày áp dụng"
          rules={[{ required: true, message: "Chọn ngày áp dụng" }]}
        >
          <Select
            placeholder="Chọn ngày áp dụng"
            options={[
              { label: "Ngày thường", value: 1 },
              { label: "Ngày lễ", value: 2 },
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
          <TimePicker.RangePicker
            format={format}
            className="w-full"
            allowClear={false}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ShowtimeSlotDialog;
