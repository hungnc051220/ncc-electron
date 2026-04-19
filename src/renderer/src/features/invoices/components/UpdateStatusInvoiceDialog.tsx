import { UpdateStatusInvoiceDto } from "@renderer/api/invoice.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useUpdateStatusInvoice } from "@renderer/hooks/invoices/useUpdateStatusInvoice";
import { InvoiceProps, InvoiceStatus } from "@shared/types";
import type { FormProps } from "antd";
import { Form, Modal, Select } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

interface UpdateStatusInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: InvoiceProps | null;
}

const UpdateStatusInvoiceDialog = ({
  open,
  onOpenChange,
  editingItem
}: UpdateStatusInvoiceDialogProps) => {
  const { message } = useAntdApp();

  const [form] = Form.useForm();

  const updateStatusInvoice = useUpdateStatusInvoice();

  const onOk = () => form.submit();
  const onCancel = () => onOpenChange(false);

  const getInitialValues = (): UpdateStatusInvoiceDto | undefined => {
    if (!editingItem) {
      return undefined;
    }

    return { status: editingItem.status };
  };

  const onFinish: FormProps<UpdateStatusInvoiceDto>["onFinish"] = (
    values: UpdateStatusInvoiceDto
  ) => {
    if (!editingItem) return;

    updateStatusInvoice.mutate(
      { id: editingItem.id, dto: values },
      {
        onSuccess: () => {
          message.success("Cập nhật trạng thái hóa đơn điện tử thành công");
          onCancel();
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Cập nhật trạng thái hóa đơn điện tử thất bại"));
        }
      }
    );
  };

  return (
    <Modal
      open={open}
      title="Cập nhật trạng thái hóa đơn điện tử"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: updateStatusInvoice.isPending
      }}
      cancelButtonProps={{
        disabled: updateStatusInvoice.isPending
      }}
      width={400}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={getInitialValues()}>
        <Form.Item<UpdateStatusInvoiceDto> name="status" label="Trạng thái">
          <Select
            options={[
              { label: "Mới", value: InvoiceStatus.NEW },
              { label: "Đang xử lý", value: InvoiceStatus.PROCESSING },
              { label: "Hoàn thành", value: InvoiceStatus.COMPLETED }
            ]}
            placeholder="Chọn trạng thái"
            className="w-full"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UpdateStatusInvoiceDialog;
