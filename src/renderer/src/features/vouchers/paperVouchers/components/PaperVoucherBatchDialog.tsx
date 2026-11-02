import {
  useCreatePaperVoucherBatch,
  useUpdatePaperVoucherBatch
} from "@renderer/hooks/paperVouchers/usePaperVoucherBatchMutations";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { formatMoney, formatNumber, formatter } from "@renderer/lib/utils";
import type {
  PaperVoucherBatch,
  PaperVoucherBatchDto,
  PaperVoucherImage,
  PaperVoucherImageDraft
} from "@shared/types";
import type { FormProps } from "antd";
import { Alert, DatePicker, Form, Input, InputNumber, Modal } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  PAPER_VOUCHER_DATE_FORMAT,
  PAPER_VOUCHER_DISPLAY_DATE_FORMAT,
  validatePaperVoucherBatchDto
} from "../paperVoucher.utils";
import {
  getPaperVoucherResultMessage,
  PAPER_VOUCHER_NO_PERMISSION_MESSAGE
} from "../paperVoucherMessages";
import PaperVoucherImageInput from "./PaperVoucherImageInput";

type FormValues = {
  name: string;
  faceValue?: number;
  totalQuantity?: number;
  validFrom?: Dayjs | null;
  expiresAt?: Dayjs | null;
  note?: string;
  images?: PaperVoucherImageDraft[];
};

interface PaperVoucherBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBatch?: PaperVoucherBatch | null;
  canSubmit: boolean;
}

const isSameImageList = (drafts: PaperVoucherImageDraft[], original: PaperVoucherImage[]) =>
  drafts.length === original.length &&
  drafts.every((draft, index) => !("file" in draft) && draft.url === original[index].url);

/** Chỉ gửi danh sách ảnh khi có thay đổi (thêm, xóa, đổi thứ tự); còn lại giữ nguyên ảnh cũ. */
const toImagesChange = (
  drafts: PaperVoucherImageDraft[] = [],
  original: PaperVoucherImage[] = []
): PaperVoucherImageDraft[] | undefined =>
  isSameImageList(drafts, original) ? undefined : drafts;

const toDto = (
  values: FormValues,
  editingBatch?: PaperVoucherBatch | null
): PaperVoucherBatchDto => ({
  name: values.name?.trim() ?? "",
  faceValue: values.faceValue ?? 0,
  totalQuantity: values.totalQuantity ?? 0,
  validFrom: values.validFrom ? values.validFrom.format(PAPER_VOUCHER_DATE_FORMAT) : null,
  expiresAt: values.expiresAt ? values.expiresAt.format(PAPER_VOUCHER_DATE_FORMAT) : null,
  note: values.note?.trim() || null,
  images: toImagesChange(values.images, editingBatch?.images)
});

const PaperVoucherBatchDialog = ({
  open,
  onOpenChange,
  editingBatch,
  canSubmit
}: PaperVoucherBatchDialogProps) => {
  const { message } = useAntdApp();
  const [form] = Form.useForm<FormValues>();
  const isEdit = !!editingBatch;
  const usedCount = editingBatch?.usedCount ?? 0;
  const isHistoryLocked = usedCount > 0;

  const createBatch = useCreatePaperVoucherBatch();
  const updateBatch = useUpdatePaperVoucherBatch();
  const isPending = createBatch.isPending || updateBatch.isPending;

  const faceValue = Form.useWatch("faceValue", form);
  const totalQuantity = Form.useWatch("totalQuantity", form);
  const totalValue = (faceValue || 0) * (totalQuantity || 0);

  const initialValues: FormValues = editingBatch
    ? {
        name: editingBatch.name,
        faceValue: editingBatch.faceValue,
        totalQuantity: editingBatch.totalQuantity,
        validFrom: editingBatch.validFrom ? dayjs(editingBatch.validFrom) : null,
        expiresAt: editingBatch.expiresAt ? dayjs(editingBatch.expiresAt) : null,
        note: editingBatch.note ?? undefined,
        images: editingBatch.images ?? []
      }
    : { name: "", images: [] };

  const onCancel = () => onOpenChange(false);

  const onFinish: FormProps<FormValues>["onFinish"] = (values) => {
    if (!canSubmit) {
      message.error(PAPER_VOUCHER_NO_PERMISSION_MESSAGE);
      return;
    }

    const dto = toDto(values, editingBatch);
    const error = validatePaperVoucherBatchDto(dto, editingBatch ?? undefined);
    if (error) {
      message.error(error);
      return;
    }

    const handlers = {
      onSuccess: () => {
        message.success(
          getPaperVoucherResultMessage(isEdit ? "Đã cập nhật lô voucher" : "Đã tạo lô voucher")
        );
        onCancel();
      },
      onError: (mutationError: unknown) => {
        message.error(
          getApiErrorMessage(
            mutationError,
            isEdit ? "Cập nhật lô voucher thất bại" : "Tạo lô voucher thất bại"
          )
        );
      }
    };

    if (editingBatch) {
      updateBatch.mutate({ id: editingBatch.id, dto }, handlers);
    } else {
      createBatch.mutate(dto, handlers);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Chỉnh sửa lô voucher giấy" : "Tạo lô voucher giấy"}
      okText={isEdit ? "Lưu thay đổi" : "Tạo lô"}
      onOk={() => form.submit()}
      onCancel={onCancel}
      okButtonProps={{ loading: isPending, disabled: !canSubmit }}
      cancelButtonProps={{ disabled: isPending }}
      width={640}
      styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }}
      destroyOnHidden
    >
      {isHistoryLocked && (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          title={`Lô đã ghi nhận ${formatNumber(usedCount)} lượt sử dụng`}
          description="Không thể đổi mệnh giá và thời hạn áp dụng để giữ đúng lịch sử đối soát. Số lượng không được nhỏ hơn số đã sử dụng."
        />
      )}
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
      >
        <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-x-4">
          <Form.Item label="Mã lô">
            <Input value={editingBatch?.batchCode} placeholder="Tự sinh khi tạo" disabled />
          </Form.Item>
          <Form.Item<FormValues>
            name="name"
            label="Tên lô"
            rules={[
              { required: true, whitespace: true, message: "Nhập tên lô" },
              { max: 200, message: "Tên lô tối đa 200 ký tự" }
            ]}
          >
            <Input placeholder="VD: Voucher giấy 100.000đ - 2026" />
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item<FormValues>
            name="faceValue"
            label="Mệnh giá (VNĐ)"
            rules={[
              { required: true, message: "Nhập mệnh giá" },
              {
                validator: (_, value?: number) =>
                  value === undefined || value === null || (Number.isInteger(value) && value > 0)
                    ? Promise.resolve()
                    : Promise.reject(new Error("Mệnh giá phải là số nguyên lớn hơn 0"))
              }
            ]}
          >
            <InputNumber<number>
              className="w-full"
              min={1}
              precision={0}
              formatter={formatter}
              parser={(value) => Number(value?.replace(/,/g, "") || 0)}
              placeholder="VD: 100,000"
              disabled={isHistoryLocked}
            />
          </Form.Item>
          <Form.Item<FormValues>
            name="totalQuantity"
            label="Số lượng phát hành"
            rules={[
              { required: true, message: "Nhập số lượng" },
              {
                validator: (_, value?: number) => {
                  if (value === undefined || value === null) return Promise.resolve();
                  if (!Number.isInteger(value) || value <= 0) {
                    return Promise.reject(new Error("Số lượng phải là số nguyên dương"));
                  }
                  if (value < usedCount) {
                    return Promise.reject(
                      new Error(`Không được nhỏ hơn số đã sử dụng (${formatNumber(usedCount)})`)
                    );
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber<number>
              className="w-full"
              min={1}
              precision={0}
              formatter={formatter}
              parser={(value) => Number(value?.replace(/,/g, "") || 0)}
              placeholder="VD: 500"
            />
          </Form.Item>
          <Form.Item<FormValues> name="validFrom" label="Ngày bắt đầu">
            <DatePicker
              className="w-full"
              format={PAPER_VOUCHER_DISPLAY_DATE_FORMAT}
              placeholder="Không bắt buộc"
              disabled={isHistoryLocked}
            />
          </Form.Item>
          <Form.Item<FormValues>
            name="expiresAt"
            label="Ngày hết hạn"
            dependencies={["validFrom"]}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value?: Dayjs | null) => {
                  const validFrom = getFieldValue("validFrom") as Dayjs | null | undefined;
                  if (!value || !validFrom || !value.isBefore(validFrom, "day")) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Ngày hết hạn không được trước ngày bắt đầu"));
                }
              })
            ]}
          >
            <DatePicker
              className="w-full"
              format={PAPER_VOUCHER_DISPLAY_DATE_FORMAT}
              placeholder="Không thời hạn"
              disabled={isHistoryLocked}
            />
          </Form.Item>
        </div>
        <Form.Item<FormValues>
          name="note"
          label="Ghi chú"
          rules={[{ max: 500, message: "Ghi chú tối đa 500 ký tự" }]}
        >
          <Input.TextArea rows={2} placeholder="Không bắt buộc" />
        </Form.Item>
        <section aria-label="Hình ảnh voucher">
          <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Hình ảnh voucher
          </h4>
          <Form.Item<FormValues> name="images">
            <PaperVoucherImageInput disabled={!canSubmit || isPending} />
          </Form.Item>
        </section>
      </Form>
      <div className="flex items-center justify-between rounded-lg border border-app-border bg-slate-50 px-3 py-2.5 dark:bg-white/5">
        <span className="text-slate-600 dark:text-slate-300">Tổng giá trị lô</span>
        <span
          data-testid="paper-voucher-total-value"
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          {formatMoney(totalValue)}
        </span>
      </div>
    </Modal>
  );
};

export default PaperVoucherBatchDialog;
