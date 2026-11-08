// Dialog "Chỉnh sửa giá vé U22": hai ô nhóm mặc định, chế độ nâng cao 7 ô, bảng xem trước cả tuần.
// Lưu là gửi đủ 7 giá + `version` trong một lệnh PUT; backend cập nhật nguyên tử, 409 nếu người khác vừa lưu.
import { U22_PRICE_CONFIG_CHANGED } from "@renderer/api/u22PriceConfig.api";
import { useUpdateU22PriceConfig } from "@renderer/hooks/ticketPrices/useUpdateU22PriceConfig";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import {
  getApiErrorCode,
  getApiErrorDetails,
  getSafeApiErrorMessage
} from "@renderer/lib/apiError";
import type { U22PriceConfig } from "@shared/types";
import { Alert, Modal, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import U22PriceFields from "./U22PriceFields";
import {
  formatU22Price,
  getChangedDays,
  getInvalidDays,
  hasCustomPrices,
  pickU22Prices,
  toU22WeekPrices,
  U22_DAYS,
  type U22Day,
  type U22DraftPrices
} from "./u22PriceGroups";

const { Text } = Typography;

type PreviewRow = { kind: "saved" | "draft"; label: string };

const WeekPreview = ({ saved, draft }: { saved: U22DraftPrices; draft: U22DraftPrices }) => {
  const changed = new Set(getChangedDays(saved, draft));
  const renderCell = (row: PreviewRow, day: U22Day) => {
    const value = row.kind === "saved" ? saved[day.key] : draft[day.key];
    const highlight = row.kind === "draft" && changed.has(day.key);
    return (
      <span
        className={highlight ? "font-semibold text-orange-600" : undefined}
        data-changed={highlight || undefined}
      >
        {formatU22Price(value)}
      </span>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Xem trước giá cả tuần</span>
        <Text type="secondary">
          {changed.size ? `${changed.size} ngày thay đổi` : "Chưa có thay đổi"}
        </Text>
      </div>
      <Table<PreviewRow>
        size="small"
        bordered
        pagination={false}
        rowKey="kind"
        dataSource={[
          { kind: "saved", label: "Giá đang áp dụng" },
          { kind: "draft", label: "Giá sau khi lưu" }
        ]}
        columns={[
          { title: "", dataIndex: "label", width: 150 },
          ...U22_DAYS.map((day) => ({
            title: day.short,
            key: day.key,
            align: "right" as const,
            render: (_: unknown, row: PreviewRow) => renderCell(row, day)
          }))
        ]}
      />
    </div>
  );
};

type ConflictInfo = { updatedUser?: string; updatedOnUtc?: string };

const readConflict = (error: unknown): ConflictInfo => {
  const details = getApiErrorDetails(error) as { current?: Partial<U22PriceConfig> } | undefined;
  return {
    updatedUser: details?.current?.updatedUser,
    updatedOnUtc: details?.current?.updatedOnUtc
  };
};

const formatDateTime = (iso?: string) => (iso ? dayjs(iso).format("DD/MM/YYYY HH:mm") : "");

type U22PriceEditDialogProps = {
  config: U22PriceConfig;
  onClose: () => void;
};

const U22PriceEditDialog = ({ config, onClose }: U22PriceEditDialogProps) => {
  const { message } = useAntdApp();
  const saved = useMemo(() => pickU22Prices(config), [config]);
  const [prices, setPrices] = useState<U22DraftPrices>(saved);
  const [expanded, setExpanded] = useState(hasCustomPrices(saved));
  const [submitted, setSubmitted] = useState(false);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const updateMutation = useUpdateU22PriceConfig();

  const invalidDays = getInvalidDays(prices);
  const changed = getChangedDays(saved, prices).length > 0;

  const submit = () => {
    setSubmitted(true);
    setServerError(null);
    if (invalidDays.length > 0) return;
    updateMutation.mutate(
      { ...toU22WeekPrices(prices), version: config.version },
      {
        onSuccess: () => {
          message.success("Đã lưu giá vé U22");
          onClose();
        },
        onError: (error) => {
          if (getApiErrorCode(error) === U22_PRICE_CONFIG_CHANGED) {
            setConflict(readConflict(error));
            return;
          }
          setServerError(getSafeApiErrorMessage(error, "Không lưu được giá vé U22"));
        }
      }
    );
  };

  const saving = updateMutation.isPending;

  return (
    <Modal
      open
      width={760}
      title="Chỉnh sửa giá vé U22"
      okText="Lưu giá"
      cancelText={conflict ? "Đóng" : "Hủy"}
      okButtonProps={{ disabled: !changed || Boolean(conflict) }}
      confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }}
      onOk={submit}
      onCancel={saving ? undefined : onClose}
      maskClosable={false}
      destroyOnHidden
    >
      <div className="flex flex-col gap-4">
        {conflict && (
          <Alert
            type="error"
            showIcon
            title="Giá U22 vừa được cập nhật bởi người khác"
            description={`${conflict.updatedUser ?? "Người dùng khác"} đã lưu lúc ${formatDateTime(conflict.updatedOnUtc)}. Giá bạn nhập chưa được lưu. Đóng hộp thoại để tải lại giá mới nhất rồi chỉnh sửa lại.`}
          />
        )}
        {serverError && <Alert type="error" showIcon title={serverError} />}
        <U22PriceFields
          prices={prices}
          onChange={setPrices}
          expanded={expanded}
          onExpandedChange={setExpanded}
          showErrors={submitted}
          invalidDays={invalidDays}
          disabled={saving || Boolean(conflict)}
        />
        {submitted && invalidDays.length > 0 && (
          <Text type="danger">
            Nhập đủ giá cho cả 7 ngày: số nguyên từ 1.000đ đến 1.000.000đ, bội số của 1.000đ.
          </Text>
        )}
        <WeekPreview saved={saved} draft={prices} />
        <Text type="secondary">
          Giá mới áp dụng cho các đơn bán sau khi lưu. Vé đã bán không tính lại.
        </Text>
      </div>
    </Modal>
  );
};

export default U22PriceEditDialog;
