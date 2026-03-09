import { useCreateInvoice } from "@renderer/hooks/invoices/useCreateInvoice";
import { useInvoices } from "@renderer/hooks/invoices/useInvoices";
import { useUpdateInvoice } from "@renderer/hooks/invoices/useUpdateInvoice";
import { ApiError, InvoiceProps } from "@shared/types";
import type { FormProps } from "antd";
import { Form, Input, message, Modal } from "antd";
import axios from "axios";
import { useEffect } from "react";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

type FieldType = {
  orderId: number;
  partyA?: string;
  address?: string;
  taxCode?: string;
  phoneNumber?: string;
  email?: string;
  citizenId?: string;
  representative?: string;
  position?: string;
  imageUrl?: string;
  note?: string;
};

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: number;
  editingItem?: InvoiceProps | null;
}

const InvoiceDialog = ({ open, onOpenChange, orderId, editingItem }: InvoiceDialogProps) => {
  const [form] = Form.useForm();
  const isEdit = !!editingItem;

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const { data } = useInvoices({ current: 1, pageSize: 1, orderId }, { enabled: !!orderId });
  const invoiceData = data?.data[0];

  useEffect(() => {
    if (invoiceData) {
      form.setFieldsValue(invoiceData);
    }
  }, [invoiceData, form]);

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType | undefined => {
    if (!editingItem) {
      return undefined;
    }

    return { ...editingItem };
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit && !invoiceData) {
      createInvoice.mutate(
        { ...values, orderId: orderId! },
        {
          onSuccess: () => {
            message.success("Thêm hóa đơn điện tử thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Thêm hóa đơn điện tử thất bại";

            if (axios.isAxiosError<ApiError>(error)) {
              msg = error.response?.data?.message ?? msg;
            }

            message.error(msg);
          }
        }
      );
    } else {
      const invoiceId = editingItem?.id ?? invoiceData?.id;

      if (!invoiceId) {
        message.error("Không tìm thấy hóa đơn để cập nhật");
        return;
      }

      updateInvoice.mutate(
        { id: invoiceId, dto: values },
        {
          onSuccess: () => {
            message.success("Cập nhật hóa đơn điện tử thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            let msg = "Cập nhật hóa đơn điện tử thất bại";

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
      title={isEdit || invoiceData ? "Cập nhật hóa đơn điện tử" : "Thêm mới hóa đơn điện tử"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: createInvoice.isPending || updateInvoice.isPending
      }}
      cancelButtonProps={{
        disabled: createInvoice.isPending || updateInvoice.isPending
      }}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        {invoiceData && (
          <div className="mb-2 flex justify-end">
            <InvoiceStatusBadge status={invoiceData.status} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item<FieldType> name="partyA" label="Bên A">
            <Input placeholder="Nhập bên A" />
          </Form.Item>
          <Form.Item<FieldType> name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ" />
          </Form.Item>
          <Form.Item<FieldType> name="taxCode" label="Mã số thuế">
            <Input placeholder="Nhập mã số thuế" />
          </Form.Item>
          <Form.Item<FieldType> name="phoneNumber" label="Số điện thoại">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item<FieldType> name="email" label="Email">
            <Input placeholder="Nhập email" />
          </Form.Item>
          <Form.Item<FieldType> name="citizenId" label="Số căn cước công dân">
            <Input placeholder="Nhập số căn cước công dân" />
          </Form.Item>
          <Form.Item<FieldType> name="representative" label="Đại diện">
            <Input placeholder="Nhập dại diện" />
          </Form.Item>
          <Form.Item<FieldType> name="position" label="Chức vụ">
            <Input placeholder="Nhập chức vụ" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default InvoiceDialog;
