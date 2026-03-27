import { useCreateInvoice } from "@renderer/hooks/invoices/useCreateInvoice";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useInvoices } from "@renderer/hooks/invoices/useInvoices";
import { useUpdateInvoice } from "@renderer/hooks/invoices/useUpdateInvoice";
import { applyVirtualKeyboardButton } from "@renderer/lib/vietnameseTelex";
import { InvoiceProps } from "@shared/types";
import type { FormProps } from "antd";
import { Form, Input, message, Modal, Select } from "antd";
import { ChevronDown } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

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
  enableVirtualKeyboardDrawer?: boolean;
}

const InvoiceDialog = ({
  open,
  onOpenChange,
  orderId,
  editingItem,
  enableVirtualKeyboardDrawer = false
}: InvoiceDialogProps) => {
  const [form] = Form.useForm();
  const keyboardRef = useRef<{
    setInput: (input: string, inputName?: string) => void;
  } | null>(null);
  const isEdit = !!editingItem;
  const [activeField, setActiveField] = useState<KeyboardField>("partyA");
  const [layoutName, setLayoutName] = useState<"default" | "shift">("default");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardInputs, setKeyboardInputs] = useState<Partial<FieldType>>({});
  const inputRefs = useRef(
    new Map<
      KeyboardField,
      {
        focus: () => void;
      }
    >()
  );

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
    if (!open) {
      setIsKeyboardOpen(false);
      setLayoutName("default");
    }
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

  const keyboardFields = useMemo<KeyboardField[]>(
    () => [
      "partyA",
      "address",
      "taxCode",
      "phoneNumber",
      "email",
      "citizenId",
      "representative",
      "position",
      "contractCode"
    ],
    []
  );

  const visibleKeyboardFields = useMemo(() => {
    return keyboardFields.filter((field) => {
      if (field === "taxCode" || field === "representative" || field === "position") {
        return invoiceType === "business";
      }

      if (field === "citizenId") {
        return invoiceType === "personal";
      }

      return true;
    });
  }, [invoiceType, keyboardFields]);

  const keyboardFieldSet = useMemo(
    () =>
      new Set<KeyboardField>([
        "partyA",
        "address",
        "taxCode",
        "phoneNumber",
        "email",
        "citizenId",
        "representative",
        "position",
        "contractCode"
      ]),
    []
  );

  const updateFieldValue = (field: KeyboardField, value: string) => {
    const nextValues = { ...keyboardInputs, [field]: value };
    setKeyboardInputs(nextValues);
    form.setFieldValue(field, value);
    keyboardRef.current?.setInput(value, String(field));
  };

  const openKeyboardDrawer = (field: KeyboardField) => {
    if (!enableVirtualKeyboardDrawer || !keyboardFieldSet.has(field)) return;
    setActiveField(field);
    setIsKeyboardOpen(true);
  };

  const handleInputChange = (field: KeyboardField) => (e: ChangeEvent<HTMLInputElement>) => {
    updateFieldValue(field, e.target.value);
  };

  const handleKeyboardKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName((current) => (current === "default" ? "shift" : "default"));
      return;
    }

    if (button === "{tab}") {
      const currentIndex = visibleKeyboardFields.indexOf(activeField);
      const nextField =
        visibleKeyboardFields[
          currentIndex >= 0 ? (currentIndex + 1) % visibleKeyboardFields.length : 0
        ];
      setActiveField(nextField);
      window.setTimeout(() => {
        inputRefs.current.get(nextField)?.focus();
      }, 0);
      return;
    }

    if (button === "{enter}") {
      form.submit();
      return;
    }

    const currentValue = String(
      keyboardInputs[activeField] ?? form.getFieldValue(activeField) ?? ""
    );
    updateFieldValue(activeField, applyVirtualKeyboardButton(currentValue, button));
  };

  const inputProps = (field: KeyboardField, placeholder: string) => ({
    placeholder,
    value: keyboardInputs[field] ?? form.getFieldValue(field),
    onFocus: () => openKeyboardDrawer(field),
    onChange: handleInputChange(field),
    ref: (node: { focus: () => void } | null) => {
      if (node) {
        inputRefs.current.set(field, node);
      } else {
        inputRefs.current.delete(field);
      }
    }
  });

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    if (!isEdit && !invoiceData) {
      createInvoice.mutate(
        { ...values, orderId: orderId! },
        {
          onSuccess: () => {
            message.success("Thêm hóa đơn điện tử thành công");
            setIsKeyboardOpen(false);
            onCancel();
          },
          onError: (error: unknown) => {
            message.error(getApiErrorMessage(error, "Thêm hóa đơn điện tử thất bại"));
          }
        }
      );
    } else {
      const invoiceId = editingItem?.id ?? invoiceData?.id;

      if (!invoiceId || !orderId) {
        message.error("Không tìm thấy hóa đơn để cập nhật");
        return;
      }

      updateInvoice.mutate(
        { id: invoiceId, dto: { orderId, ...values } },
        {
          onSuccess: () => {
            message.success("Cập nhật hóa đơn điện tử thành công");
            setIsKeyboardOpen(false);
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
        className={enableVirtualKeyboardDrawer ? "invoice-dialog-with-keyboard" : undefined}
        style={{ top: 20 }}
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

      {enableVirtualKeyboardDrawer && open && (
        <div className={`invoice-keyboard-drawer ${isKeyboardOpen ? "is-open" : ""}`}>
          <div className="invoice-keyboard-drawer__header">
            <span className="invoice-keyboard-drawer__title">Bàn phím ảo</span>
            <button
              type="button"
              onClick={() => setIsKeyboardOpen(false)}
              className="invoice-keyboard-drawer__close"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <Keyboard
            keyboardRef={(instance) => {
              keyboardRef.current = instance;
            }}
            theme="hg-theme-default invoice-keyboard-theme"
            layoutName={layoutName}
            inputName={String(activeField)}
            onKeyPress={handleKeyboardKeyPress}
            layout={{
              default: [
                "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
                "{tab} q w e r t y u i o p [ ] \\",
                "{lock} a s d f g h j k l ; '",
                "{shift} z x c v b n m , . / {shift}",
                ".com @ {space} {enter}"
              ],
              shift: [
                "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
                "{tab} Q W E R T Y U I O P { } |",
                '{lock} A S D F G H J K L : "',
                "{shift} Z X C V B N M < > ? {shift}",
                ".com @ {space} {enter}"
              ]
            }}
          />
        </div>
      )}
    </>
  );
};

export default InvoiceDialog;
