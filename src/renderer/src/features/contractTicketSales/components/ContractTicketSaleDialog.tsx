"use client";

import { useCreateContractTicketSale } from "@renderer/hooks/contractTicketSales/useCreateContractTicketSale";
import { useUpdateContractTicketSale } from "@renderer/hooks/contractTicketSales/useUpdateContractTicketSale";
import { formatter } from "@renderer/lib/utils";
import { ApiError, OrderResponseProps } from "@renderer/types";
import type { FormProps } from "antd";
import { Form, Input, InputNumber, message, Modal } from "antd";
import axios from "axios";

type FieldType = {
  customerFirstName: string;
  customerPhone: string;
  orderTotal: number;
};

interface CancellationReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: OrderResponseProps | null;
}

const ContractTicketSaleDialog = ({
  open,
  onOpenChange,
  selectedItem
}: CancellationReasonDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!selectedItem;

  const createContractTicketSale = useCreateContractTicketSale();
  const updateContractTicketSale = useUpdateContractTicketSale();

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!selectedItem) return undefined;
    return {
      customerFirstName: selectedItem.customerFirstName,
      customerPhone: selectedItem.customerPhone,
      orderTotal: selectedItem.orderTotal
    };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit) {
      createContractTicketSale.mutate(values, {
        onSuccess: () => {
          message.success("Thêm vé bán hợp đồng thành công");
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          let msg = "Thêm vé bán hợp đồng thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      });
    } else {
      updateContractTicketSale.mutate(
        { id: selectedItem.id, dto: values },
        {
          onSuccess: () => {
            message.success("Cập nhật vé bán hợp đồng thành công");
            onOpenChange(false);
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật vé bán hợp đồng thất bại";

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
      title={isEdit ? "Cập nhật vé bán hợp đồng" : "Thêm mới vé bán hợp đồng"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createContractTicketSale.isPending || updateContractTicketSale.isPending
      }}
      cancelButtonProps={{
        disabled: createContractTicketSale.isPending || updateContractTicketSale.isPending
      }}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <Form.Item<FieldType>
          name="customerFirstName"
          label="Tên khách hàng"
          rules={[{ required: true, message: "Nhập tên khách hàng" }]}
        >
          <Input placeholder="Nhập tên khách hàng" />
        </Form.Item>
        <Form.Item<FieldType>
          name="customerPhone"
          label="Số điện thoại"
          rules={[{ required: true, message: "Nhập số điện thoại" }]}
        >
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>
        <Form.Item<FieldType>
          name="orderTotal"
          label="Giá trị hợp đồng"
          rules={[{ required: true, message: "Nhập giá trị hợp đồng" }]}
        >
          <InputNumber
            min={0}
            placeholder="Nhập giá trị hợp đồng"
            className="w-full"
            suffix="đ"
            formatter={formatter}
            parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as unknown as number}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ContractTicketSaleDialog;
