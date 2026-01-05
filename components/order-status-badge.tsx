import { OrderStatus, PaymentStatus } from "@/types"

interface OrderStatusBadgeProps {
  status: OrderStatus | PaymentStatus
  type?: "order" | "payment"
}

const orderStatusConfig = {
  [OrderStatus.PENDING]: {
    label: "Đang chờ",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    dotColor: "bg-yellow-500",
  },
  [OrderStatus.PROCESSING]: {
    label: "Đang xử lý",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    dotColor: "bg-blue-500",
  },
  [OrderStatus.COMPLETED]: {
    label: "Hoàn thành",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    dotColor: "bg-green-500",
  },
  [OrderStatus.CANCELLED]: {
    label: "Hủy bỏ",
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
    dotColor: "bg-orange-500",
  },
  [OrderStatus.FAIL]: {
    label: "Thất bại",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    dotColor: "bg-red-500",
  },
}

const paymentStatusConfig = {
  [PaymentStatus.PENDING]: {
    label: "Đang chờ",
    bgColor: "bg-slate-100",
    textColor: "text-slate-800",
    dotColor: "bg-slate-500",
  },
  [PaymentStatus.AUTHORIZED]: {
    label: "Được ủy quyền",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-800",
    dotColor: "bg-indigo-500",
  },
  [PaymentStatus.PAID]: {
    label: "Đã thanh toán",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-800",
    dotColor: "bg-emerald-500",
  },
  [PaymentStatus.PARTIALLY_REFUNDED]: {
    label: "Hoàn tiền 1 phần",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-800",
    dotColor: "bg-cyan-500",
  },
  [PaymentStatus.REFUNDED]: {
    label: "Đã hoàn tiền",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    dotColor: "bg-purple-500",
  },
  [PaymentStatus.VOIDED]: {
    label: "Đã hủy",
    bgColor: "bg-fuchsia-100",
    textColor: "text-fuchsia-800",
    dotColor: "bg-fuchsia-500",
  },
  [PaymentStatus.FAIL]: {
    label: "Thất bại",
    bgColor: "bg-rose-100",
    textColor: "text-rose-800",
    dotColor: "bg-rose-500",
  },
}

export function OrderStatusBadge({ status, type = "order" }: OrderStatusBadgeProps) {
  const config =
    type === "order" ? orderStatusConfig[status as OrderStatus] : paymentStatusConfig[status as PaymentStatus]

  if (!config) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
      {config.label}
    </span>
  )
}
