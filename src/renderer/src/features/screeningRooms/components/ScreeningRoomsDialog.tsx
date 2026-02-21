import { useCreateScreeningRoom } from "@renderer/hooks/screeningRooms/useCreateScreeningRoom";
import { useUpdateScreeningRoom } from "@renderer/hooks/screeningRooms/useUpdateScreeningRoom";
import { ApiError, RoomProps } from "@shared/types";
import type { FormProps } from "antd";
import { Col, Form, Input, InputNumber, message, Modal, Row, Select } from "antd";
import axios from "axios";

const ruleOrderOptions = [
  {
    value: "Tuần tự từ trái qua phải",
    label: "Tuần tự từ trái qua phải"
  },
  {
    value: "Tuần tự từ phải qua trái",
    label: "Tuần tự từ phải qua trái"
  },
  {
    value: "Chẵn bên trái, lẻ bên phải",
    label: "Chẵn bên trái, lẻ bên phải"
  },
  {
    value: "Lẻ bên trái, chẵn bên phải",
    label: "Lẻ bên trái, chẵn bên phải"
  }
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

const ScreeningRoomsDialog = ({ open, onOpenChange, editingRoom }: ScreeningRoomsDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingRoom;

  const numberOfFloor = Form.useWatch("numberOfFloor", form) || 1;

  const createScreeningRoom = useCreateScreeningRoom();
  const updateScreeningRoom = useUpdateScreeningRoom();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType | undefined => {
    if (!editingRoom) {
      return {
        name: "",
        numberOfFloor: 1,
        ruleOrder: "Tuần tự từ trái qua phải"
      };
    }
    return editingRoom;
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit) {
      createScreeningRoom.mutate(values, {
        onSuccess: () => {
          message.success("Thêm phòng chiếu thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          let msg = "Thêm phòng chiếu thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      });
    } else {
      updateScreeningRoom.mutate(
        { id: editingRoom.id, dto: values },
        {
          onSuccess: () => {
            message.success("Cập nhật phòng chiếu thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật phòng chiếu thất bại";

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
      title={isEdit ? "Cập nhật phòng chiếu" : "Thêm mới phòng chiếu"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createScreeningRoom.isPending || updateScreeningRoom.isPending
      }}
      cancelButtonProps={{
        disabled: createScreeningRoom.isPending || updateScreeningRoom.isPending
      }}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
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
                { label: 3, value: 3 }
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
          <Select placeholder="Chọn quy luật xếp ghế" options={ruleOrderOptions} />
        </Form.Item>

        <div className="bg-goku dark:bg-app-bg-container rounded-lg p-4 space-y-4">
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
