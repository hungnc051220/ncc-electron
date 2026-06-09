import { useCreateInvoice } from "@renderer/hooks/invoices/useCreateInvoice";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useInvoices } from "@renderer/hooks/invoices/useInvoices";
import { useUpdateInvoice } from "@renderer/hooks/invoices/useUpdateInvoice";
import { InvoiceProps } from "@shared/types";
import type { FormProps } from "antd";
import { Form, Input, Modal, Select } from "antd";
import { ChangeEvent, useEffect, useState } from "react";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

type FieldType = {
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
  contractCode?: string;
  invoiceType: "personal" | "business";
};

type KeyboardField =
  | "partyA"
  | "address"
  | "taxCode"
  | "phoneNumber"
  | "email"
  | "citizenId"
  | "representative"
  | "position"
  | "contractCode";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: number;
  editingItem?: InvoiceProps | null;
}

const InvoiceDialog = ({ open, onOpenChange, orderId, editingItem }: InvoiceDialogProps) => {
  const { message } = useAntdApp();

  const [form] = Form.useForm();
  const isEdit = !!editingItem;
  const [keyboardInputs, setKeyboardInputs] = useState<Partial<FieldType>>({});

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const { data } = useInvoices({ current: 1, pageSize: 1, orderId }, { enabled: !!orderId });
  const invoiceData = data?.data[0];

  const invoiceType = Form.useWatch("invoiceType", form);

  useEffect(() => {
    if (invoiceData) {
      form.setFieldsValue(invoiceData);
      setKeyboardInputs(invoiceData);
    }
  }, [invoiceData, form]);

  useEffect(() => {
    if (!open) return;
  }, [open]);

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): FieldType | undefined => {
    if (!editingItem) {
      return {
        invoiceType: "personal"
      };
    }

    return { ...editingItem };
  };

  const updateFieldValue = (field: KeyboardField, value: string) => {
    const nextValues = { ...keyboardInputs, [field]: value };
    setKeyboardInputs(nextValues);
    form.setFieldValue(field, value);
  };

  const handleInputChange = (field: KeyboardField) => (e: ChangeEvent<HTMLInputElement>) => {
    updateFieldValue(field, e.target.value);
  };

  const inputProps = (field: KeyboardField, placeholder: string) => ({
    placeholder,
    value: keyboardInputs[field] ?? form.getFieldValue(field),
    onChange: handleInputChange(field)
  });

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
            message.error(getApiErrorMessage(error, "Thêm hóa đơn điện tử thất bại"));
          }
        }
      );
    } else {
      const invoiceId = editingItem?.id ?? invoiceData?.id;
      const resolvedOrderId = orderId ?? editingItem?.order?.id;

      if (!invoiceId || !resolvedOrderId) {
        message.error("Không tìm thấy hóa đơn để cập nhật");
        return;
      }

      updateInvoice.mutate(
        { id: invoiceId, dto: { orderId: resolvedOrderId, ...values } },
        {
          onSuccess: () => {
            message.success("Cập nhật hóa đơn điện tử thành công");
            onCancel();
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Cập nhật hóa đơn điện tử thất bại"));
          }
        }
      );
    }
  };

  return (
    <>
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
        style={{ top: 20 }}
        mask={{
          closable: false
        }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
          {invoiceData && (
            <div className="mb-2 flex justify-end">
              <InvoiceStatusBadge status={invoiceData.status} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item<FieldType> name="invoiceType" label="Loại hóa đơn">
              <Select
                options={[
                  { value: "personal", label: "Cá nhân" },
                  { value: "business", label: "Đơn vị" }
                ]}
                placeholder="Chọn loại hóa đơn"
              />
            </Form.Item>
            <Form.Item<FieldType>
              name="partyA"
              label={invoiceType === "personal" ? "Tên người mua" : "Tên đơn vị"}
            >
              <Input
                {...inputProps(
                  "partyA",
                  invoiceType === "personal" ? "Nhập tên người mua" : "Nhập tên đơn vị"
                )}
              />
            </Form.Item>
            <Form.Item<FieldType> name="address" label="Địa chỉ">
              <Input {...inputProps("address", "Nhập địa chỉ")} />
            </Form.Item>
            {invoiceType === "business" && (
              <Form.Item<FieldType> name="taxCode" label="Mã số thuế">
                <Input {...inputProps("taxCode", "Nhập mã số thuế")} />
              </Form.Item>
            )}
            <Form.Item<FieldType> name="phoneNumber" label="Số điện thoại">
              <Input {...inputProps("phoneNumber", "Nhập số điện thoại")} />
            </Form.Item>
            <Form.Item<FieldType> name="email" label="Email">
              <Input {...inputProps("email", "Nhập email")} />
            </Form.Item>
            {invoiceType === "personal" && (
              <Form.Item<FieldType> name="citizenId" label="Số căn cước công dân">
                <Input {...inputProps("citizenId", "Nhập số căn cước công dân")} />
              </Form.Item>
            )}
            {invoiceType === "business" && (
              <Form.Item<FieldType> name="representative" label="Đại diện">
                <Input {...inputProps("representative", "Nhập dại diện")} />
              </Form.Item>
            )}
            {invoiceType === "business" && (
              <Form.Item<FieldType> name="position" label="Chức vụ">
                <Input {...inputProps("position", "Nhập chức vụ")} />
              </Form.Item>
            )}
            <Form.Item<FieldType> name="contractCode" label="Hợp đồng số">
              <Input {...inputProps("contractCode", "Nhập hợp đồng số")} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default InvoiceDialog;
