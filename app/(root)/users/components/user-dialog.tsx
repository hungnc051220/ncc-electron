"use client";

import { CustomerRoleProps, ManufacturerProps, UserProps } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Form, Input, Modal, Select } from "antd";
import axios from "axios";
import { toast } from "sonner";

type FieldType = {
  roleIds: number[];
  customerFirstName: string;
  manufacturerId: number;
  address?: string;
  email: string;
  mobile: string;
  username: string;
  password?: string;
};

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser?: UserProps | null;
  customerRoles: CustomerRoleProps[];
  isFetchingCustomerRoles: boolean;
  manufactureres: ManufacturerProps[];
}

const UserDialog = ({
  open,
  onOpenChange,
  editingUser,
  customerRoles,
  isFetchingCustomerRoles,
  manufactureres,
}: UserDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!editingUser;

  const userMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/user/create", {
          ...data,
          confirmPassword: data.password,
        });
      } else {
        return axios.post("/api/user/update", { ...data, id: editingUser.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        `${isEdit ? "Cập nhật thông tin" : "Thêm"} người dùng thành công`
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!editingUser) return undefined;
    return {
      roleIds: editingUser.roleIds.split(",").map(Number) || [],
      username: editingUser.username,
      email: editingUser.email,
      manufacturerId: editingUser.manufacturerId,
      customerFirstName: editingUser.customerFirstName,
      address: editingUser.address,
      mobile: editingUser.mobile,
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    userMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật người dùng" : "Thêm mới người dùng"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: userMutation.isPending,
      }}
      width={876}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={getInitialValues()}
      >
        <div className="grid grid-cols-2 gap-x-4 mt-4">
          <Form.Item<FieldType>
            name="roleIds"
            label="Nhóm người dùng"
            rules={[{ required: true, message: "Hãy chọn nhóm người dùng" }]}
          >
            <Select
              mode="multiple"
              allowClear
              className="w-full"
              placeholder="Chọn nhóm người dùng"
              options={customerRoles?.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              loading={isFetchingCustomerRoles}
            />
          </Form.Item>

          <Form.Item<FieldType>
            name="customerFirstName"
            label="Họ và tên"
            rules={[{ required: true, message: "Hãy nhập họ và tên" }]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>

          <Form.Item name="manufacturerId" label="Hãng phát hành">
            <Select
              allowClear
              className="w-full"
              placeholder="Chọn hãng phát hành"
              options={manufactureres?.map((item) => ({
                value: item.id,
                label: item.fullName,
              }))}
            />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ" />
          </Form.Item>
          <Form.Item<FieldType>
            name="email"
            label="Email"
            rules={[{ required: true, message: "Hãy nhập email" }]}
          >
            <Input placeholder="Nhập email" />
          </Form.Item>
          <Form.Item<FieldType>
            name="mobile"
            label="Số điện thoại"
            rules={[{ required: true, message: "Hãy nhập số điện thoại" }]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item<FieldType>
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true, message: "Hãy nhập tên đăng nhập" }]}
          >
            <Input placeholder="Nhập tên đăng nhập" />
          </Form.Item>
          <Form.Item<FieldType>
            name="password"
            label="Mật khẩu"
            rules={[{ required: !isEdit, message: "Hãy nhập tên đăng nhập" }]}
          >
            <Input.Password placeholder="Nhập mật khẩu" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default UserDialog;
