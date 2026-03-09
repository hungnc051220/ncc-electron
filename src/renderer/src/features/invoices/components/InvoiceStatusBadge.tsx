import { InvoiceStatus } from "@shared/types";
import { Tag } from "antd";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

const invoiceStatusConfig = {
  [InvoiceStatus.NEW]: {
    label: "Mới",
    color: "warning"
  },
  [InvoiceStatus.PROCESSING]: {
    label: "Đang xử lý",
    color: "processing"
  },
  [InvoiceStatus.COMPLETED]: {
    label: "Hoàn thành",
    color: "success"
  }
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = invoiceStatusConfig[status as InvoiceStatus];
  if (!config) {
    return null;
  }

  return <Tag color={config.color}>{config.label}</Tag>;
}
