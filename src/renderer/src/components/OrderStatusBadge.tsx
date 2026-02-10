import { OrderStatus, PaymentStatus } from "@renderer/types";
import { Tag } from "antd";

interface OrderStatusBadgeProps {
  status: OrderStatus | PaymentStatus;
  type?: "order" | "payment";
}

const orderStatusConfig = {
  [OrderStatus.PENDING]: {
    label: "Đang chờ",
    color: "warning"
  },
  [OrderStatus.PROCESSING]: {
    label: "Đang xử lý",
    color: "processing"
  },
  [OrderStatus.COMPLETED]: {
    label: "Hoàn thành",
    color: "success"
  },
  [OrderStatus.CANCELLED]: {
    label: "Hủy bỏ",
    color: "orange"
  },
  [OrderStatus.FAIL]: {
    label: "Thất bại",
    color: "error"
  }
};

const paymentStatusConfig = {
  [PaymentStatus.PENDING]: {
    label: "Đang chờ",
    color: "default"
  },
  [PaymentStatus.AUTHORIZED]: {
    label: "Được ủy quyền",
    color: "blue"
  },
  [PaymentStatus.PAID]: {
    label: "Đã thanh toán",
    color: "success"
  },
  [PaymentStatus.PARTIALLY_REFUNDED]: {
    label: "Hoàn tiền 1 phần",
    color: "cyan"
  },
  [PaymentStatus.REFUNDED]: {
    label: "Đã hoàn tiền",
    color: "purple"
  },
  [PaymentStatus.VOIDED]: {
    label: "Đã hủy",
    color: "magenta"
  },
  [PaymentStatus.FAIL]: {
    label: "Thất bại",
    color: "red"
  }
};

export function OrderStatusBadge({ status, type = "order" }: OrderStatusBadgeProps) {
  const config =
    type === "order"
      ? orderStatusConfig[status as OrderStatus]
      : paymentStatusConfig[status as PaymentStatus];

  if (!config) {
    return null;
  }

  return <Tag color={config.color}>{config.label}</Tag>;
}
