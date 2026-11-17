// Ưu đãi U22 theo ngày trên Danh sách ngày (một ngày không phải ngày lễ): "Không áp dụng U22" / "Cho phép xét U22".
// Chỉ đổi cờ tắt U22 của ngày qua API promotion-exclusion; ngày vẫn ở tab phân loại gốc, giữ giá theo phân loại
// gốc, không đổi cờ ngày lễ, giá các suất đã lưu hay các chương trình ưu đãi khác.
import { useSetPromotionExclusion } from "@renderer/hooks/holidays/useDateManagement";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import type { HolidayProps } from "@shared/types";
import { Alert, Modal, Typography } from "antd";
import { useState } from "react";
import { formatDate, formatWeekday, getBaseTab } from "../dateClassification";

const { Text } = Typography;

/** `mark`: tắt U22 cho ngày; `unmark`: cho phép xét U22 trở lại. */
export type PromotionExclusionAction = "mark" | "unmark";

type PromotionExclusionDialogProps = {
  action: PromotionExclusionAction;
  day: HolidayProps;
  /** Ngày đã có suất chiếu (ghi chú ảnh hưởng tới vé bán sau khi lưu). */
  hasScreenings?: boolean;
  onClose: () => void;
  onSaved: (day: HolidayProps) => void;
};

const PromotionExclusionDialog = ({
  action,
  day,
  hasScreenings,
  onClose,
  onSaved
}: PromotionExclusionDialogProps) => {
  const { message } = useAntdApp();
  const [serverError, setServerError] = useState<string | null>(null);
  const setExclusion = useSetPromotionExclusion();
  const isMark = action === "mark";
  const keptPrice = getBaseTab(day) === "weekend" ? "Giữ giá cuối tuần" : "Giữ giá ngày thường";

  const submit = () => {
    // Chống gửi trùng khi đang lưu.
    if (setExclusion.isPending) return;
    setServerError(null);
    setExclusion.mutate(
      { dateValue: day.dateValue, excluded: isMark },
      {
        onSuccess: (saved) => {
          message.success(`Đã cập nhật chính sách U22 cho ngày ${formatDate(day.dateValue)}.`);
          onSaved(saved);
        },
        onError: (error) =>
          setServerError(getSafeApiErrorMessage(error, "Không cập nhật được chính sách U22"))
      }
    );
  };

  return (
    <Modal
      open
      width={460}
      title={isMark ? "Không áp dụng U22" : "Cho phép xét U22"}
      okText="Xác nhận"
      cancelText="Hủy"
      onOk={submit}
      onCancel={setExclusion.isPending ? undefined : onClose}
      confirmLoading={setExclusion.isPending}
      cancelButtonProps={{ disabled: setExclusion.isPending }}
      mask={{ closable: false }}
      destroyOnHidden
    >
      <div className="flex flex-col gap-3">
        <Text type="secondary">
          Ngày {formatDate(day.dateValue)} — {formatWeekday(day.dateValue)}
        </Text>
        {isMark ? (
          <>
            <div
              className="flex flex-col gap-0.5 rounded-md border border-(--ant-color-border-secondary) bg-(--ant-color-fill-quaternary) px-3 py-2 text-[13px]"
              data-testid="promotion-exclusion-summary"
            >
              <span>
                Giá vé: <Text strong>{keptPrice}</Text>
              </span>
              <span>
                Ưu đãi U22: <Text strong>Không áp dụng</Text>
              </span>
            </div>
            <span>Bạn có muốn tắt ưu đãi U22 cho ngày này không?</span>
            <Text type="secondary" className="text-xs">
              Không thay đổi giá các suất đã lưu và các chương trình ưu đãi khác.
            </Text>
          </>
        ) : (
          <span>Ngày này sẽ được xét ưu đãi U22 theo các điều kiện hiện hành.</span>
        )}
        {hasScreenings && (
          <Text type="secondary" className="text-xs">
            {isMark
              ? "Ngày này đã có suất chiếu: vé bán sau khi lưu không được áp ưu đãi U22."
              : "Ngày này đã có suất chiếu: vé bán sau khi lưu sẽ được xét ưu đãi U22."}
          </Text>
        )}
        {serverError && <Alert type="error" showIcon title={serverError} />}
      </div>
    </Modal>
  );
};

export default PromotionExclusionDialog;
