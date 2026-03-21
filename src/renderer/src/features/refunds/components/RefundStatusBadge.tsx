import { RefundStatus } from "@shared/types";
import { Tag } from "antd";

interface RefundStatusBadgeProps {
  status?: RefundStatus;
}

const refundStatusConfig: Record<RefundStatus, { label: string; color: string }> = {
  [RefundStatus.PENDING]: {
    label: "Chờ xử lý",
    color: "warning"
  },
  [RefundStatus.ONLINE]: {
    label: "Hoàn online",
    color: "processing"
  },
  [RefundStatus.CASH]: {
    label: "Hoàn tiền mặt",
    color: "success"
  }
};

const fallbackConfig = {
  label: "Chưa cập nhật",
  color: "default"
};

const RefundStatusBadge = ({ status }: RefundStatusBadgeProps) => {
  const config = status ? refundStatusConfig[status] : fallbackConfig;

  return (
    <Tag color={config?.color ?? fallbackConfig.color}>{config?.label ?? fallbackConfig.label}</Tag>
  );
};

export default RefundStatusBadge;
