import Icon from "@ant-design/icons";
import { useCreatePlanCinema } from "@renderer/hooks/planCinemas/useCreatePlanCinema";
import { ApiError } from "@renderer/types";
import type { FormProps } from "antd";
import { Button, Form, Input, message, Modal } from "antd";
import axios from "axios";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

type FieldType = {
  name: string;
  desciption?: string;
};

const AddPlanCinemaDialog = () => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const createPlanCinema = useCreatePlanCinema();

  const onOk = () => form.submit();
  const onCancel = () => setOpen(false);

  const getInitialValues = (): FieldType | undefined => {
    return {
      name: "",
      desciption: ""
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    createPlanCinema.mutate(values, {
      onSuccess: () => {
        message.success("Tạo kế hoạch chiếu phim thành công");
        form.resetFields();
        onCancel();
      },
      onError: (error: unknown) => {
        let msg = "Tạo kế hoạch chiếu phim thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  return (
    <>
      <Button type="primary" icon={<Icon component={PlusIcon} />} onClick={() => setOpen(true)}>
        Thêm kế hoạch
      </Button>
      <Modal
        open={open}
        title="Tạo kế hoạch chiếu phim"
        onOk={onOk}
        onCancel={() => setOpen(false)}
        okButtonProps={{
          loading: createPlanCinema.isPending
        }}
        cancelButtonProps={{
          disabled: createPlanCinema.isPending
        }}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
          <Form.Item<FieldType>
            name="name"
            label="Tên kế hoạch"
            rules={[{ required: true, message: "Nhập tên kế hoạch" }]}
          >
            <Input placeholder="Nhập tên kế hoạch" />
          </Form.Item>

          <Form.Item<FieldType> name="desciption" label="Mô tả">
            <Input.TextArea placeholder="Nhập mô tả kế hoạch" rows={5} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AddPlanCinemaDialog;
