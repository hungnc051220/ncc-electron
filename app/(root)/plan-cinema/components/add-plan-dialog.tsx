"use client";

import Icon from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Button, Form, Input, Modal } from "antd";
import axios from "axios";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type FieldType = {
  name: string;
  description?: string;
};

const AddPlanDialog = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const planCinemaMutation = useMutation({
    mutationFn: (data: FieldType) => {
      return axios.post("/api/plan-cinema/create", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-cinema"] });
      toast.success("Tạo kế hoạch chiếu phim thành công");
      setOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    return {
      name: "",
      description: "",
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    planCinemaMutation.mutate(values);
  };

  return (
    <>
      <Button
        type="primary"
        icon={<Icon component={PlusIcon} />}
        onClick={() => setOpen(true)}
      >
        Thêm kế hoạch
      </Button>
      <Modal
        open={open}
        title="Tạo kế hoạch chiếu phim"
        onOk={onOk}
        onCancel={() => setOpen(false)}
        okButtonProps={{
          loading: planCinemaMutation.isPending,
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={getInitialValues()}
        >
          <Form.Item<FieldType>
            name="name"
            label="Tên kế hoạch"
            rules={[{ required: true, message: "Nhập tên kế hoạch" }]}
          >
            <Input placeholder="Nhập tên kế hoạch" />
          </Form.Item>

          <Form.Item<FieldType> name="description" label="Mô tả">
            <Input.TextArea placeholder="Nhập mô tả kế hoạch" rows={5} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AddPlanDialog;
