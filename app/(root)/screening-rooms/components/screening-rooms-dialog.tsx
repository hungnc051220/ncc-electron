"use client";

import { RoomProps } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Col, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import axios from "axios";
import { toast } from "sonner";

const ruleOrderOptions = [
  {
    value: "Tuần tự từ trái qua phải",
    label: "Tuần tự từ trái qua phải",
  },
  {
    value: "Tuần tự từ phải qua trái",
    label: "Tuần tự từ phải qua trái",
  },
  {
    value: "Chẵn bên trái, lẻ bên phải",
    label: "Chẵn bên trái, lẻ bên phải",
  },
  {
    value: "Lẻ bên trái, chẵn bên phải",
    label: "Lẻ bên trái, chẵn bên phải",
  },
];

type FieldType = {
  name: string;
  numberOfFloor: number;
  ruleOrder: string;
};

interface ScreeningRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRoom?: RoomProps | null;
}

const ScreeningRoomsDialog = ({
  open,
  onOpenChange,
  editingRoom,
}: ScreeningRoomsDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!editingRoom;

  const numberOfFloor = Form.useWatch("numberOfFloor", form) || 1;

  const screeningRoomMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/screening-rooms/create", {
          ...data,
        });
      } else {
        return axios.post("/api/screening-rooms/update", {
          ...data,
          id: editingRoom.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screening-rooms"] });
      toast.success(`${isEdit ? "Cập nhật" : "Thêm"} phòng chiếu thành công`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!editingRoom) {
      return {
        name: "",
        numberOfFloor: 1,
        ruleOrder: "Tuần tự từ trái qua phải",
      };
    }
    return editingRoom;
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    screeningRoomMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật phòng chiếu" : "Thêm mới phòng chiếu"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: screeningRoomMutation.isPending,
      }}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={getInitialValues()}
      >
        <div className="grid grid-cols-3 gap-x-4">
          <Form.Item<FieldType>
            name="name"
            label="Tên phòng chiếu"
            rules={[{ required: true, message: "Nhập tên phòng chiếu" }]}
            className="col-span-2"
          >
            <Input placeholder="Nhập tên phòng chiếu" />
          </Form.Item>
          <Form.Item<FieldType>
            name="numberOfFloor"
            label="Số tầng"
            rules={[{ required: true, message: "Chọn số tầng" }]}
          >
            <Select
              placeholder="Chọn số tầng"
              options={[
                { label: 1, value: 1 },
                { label: 2, value: 2 },
                { label: 3, value: 3 },
              ]}
              className="w-full"
            />
          </Form.Item>
        </div>
        <Form.Item<FieldType>
          name="ruleOrder"
          label="Quy luật xếp ghế"
          rules={[{ required: true, message: "Nhập quy luật xếp ghế" }]}
        >
          <Select
            placeholder="Chọn quy luật xếp ghế"
            options={ruleOrderOptions}
          />
        </Form.Item>

        <div className="bg-gray-100 rounded-lg p-4 space-y-4">
          {Array.from({ length: numberOfFloor }).map((_, index) => {
            const floor = index + 1;

            return (
              <Row gutter={16} key={floor} align="middle">
                <Col span={4}>
                  <b>Tầng {floor}</b>
                </Col>

                <Col span={10}>
                  <Form.Item
                    label="Số hàng"
                    name={`deepSizeF${floor}`}
                    rules={[{ required: true, message: "Nhập số hàng" }]}
                  >
                    <InputNumber className="w-full" min={1} />
                  </Form.Item>
                </Col>

                <Col span={10}>
                  <Form.Item
                    label="Số ghế"
                    name={`wideSizeF${floor}`}
                    rules={[{ required: true, message: "Nhập số ghế" }]}
                  >
                    <InputNumber className="w-full" min={1} />
                  </Form.Item>
                </Col>
              </Row>
            );
          })}
        </div>
      </Form>
    </Modal>
  );
};

export default ScreeningRoomsDialog;
