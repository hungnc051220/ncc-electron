import { ordersApi } from "@renderer/api/orders.api";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useOrderDetail } from "@renderer/hooks/orders/useOrderDetail";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { cn, formatMoney } from "@renderer/lib/utils";
import RefundStatusBadge from "@renderer/features/refunds/components/RefundStatusBadge";
import { OrderDetailProps, OrderStatus, PaymentStatus } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, Modal, message } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ReloadOutlined } from "@ant-design/icons";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrderId?: number | null;
  selectedItem?: OrderDetailProps | null;
}

const OrderDetailDialog = ({
  open,
  onOpenChange,
  selectedOrderId,
  selectedItem
}: OrderDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isChangingToSuccess, setIsChangingToSuccess] = useState(false);
  const {
    data: orderDetail,
    isFetching: isFetchingOrderDetail,
    refetch: refetchOrderDetail
  } = useOrderDetail(selectedOrderId ?? selectedItem?.order.id ?? 0);

  const currentDetail = orderDetail ?? selectedItem ?? null;
  const currentOrder = currentDetail?.order;
  const currentItems = useMemo(() => currentOrder?.items ?? [], [currentOrder?.items]);
  const customerName = [currentOrder?.customerFirstName, currentOrder?.customerLastName]
    .filter(Boolean)
    .join(" ");
  const totalTickets = currentItems.reduce((sum, item) => sum + item.quantity, 0);
  const isRefundOrder = currentOrder?.refundStatusId != null;
  const canShowChangeToSuccessButton =
    !!currentOrder &&
    currentOrder.orderStatusId !== OrderStatus.CANCELLED &&
    !currentOrder.isInvitation &&
    !currentOrder.isContract &&
    !isRefundOrder;

  const ticketPromotions = useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        type: string;
        rate: number;
        amount: number;
        quantity: number;
        totalDiscount: number;
        seats: string[];
      }
    >();

    currentItems.forEach((item) => {
      if (!item.discount?.id) {
        return;
      }

      const existing = map.get(item.discount.id);
      const seats = [item.listChairValueF1, item.listChairValueF2, item.listChairValueF3].filter(
        Boolean
      ) as string[];

      if (existing) {
        existing.quantity += item.quantity;
        existing.totalDiscount += item.discountAmountInclTax || 0;
        existing.seats.push(...seats);
        return;
      }

      map.set(item.discount.id, {
        id: item.discount.id,
        name: item.discount.discountName,
        type: item.discount.discountType,
        rate: item.discount.discountRate,
        amount: item.discount.discountAmount,
        quantity: item.quantity,
        totalDiscount: item.discountAmountInclTax || 0,
        seats
      });
    });

    return Array.from(map.values());
  }, [currentItems]);

  const isU22Voucher = currentOrder?.voucherCode === "U22Ticket";

  const promotionMode =
    isU22Voucher || currentOrder?.campaign
      ? "campaign"
      : ticketPromotions.length > 0
        ? "ticket"
        : "none";

  const getChairs = () => {
    const chairsF1 = currentItems.map((item) => item.listChairValueF1);
    const chairsF2 = currentItems.map((item) => item.listChairValueF2);
    const chairsF3 = currentItems.map((item) => item.listChairValueF3);
    const allChairs = [...chairsF1, ...chairsF2, ...chairsF3].filter(Boolean);
    return allChairs.join(", ");
  };

  const getPromotionValue = (type: string, rate: number, amount: number) => {
    if (rate > 0) {
      return `-${rate}%`;
    }

    if (amount > 0) {
      return `-${formatMoney(amount)}`;
    }

    return type || "Ưu đãi đặc biệt";
  };

  const renderInfoRow = (
    label: string,
    value?: string | number | null,
    options?: {
      borderClassName?: string;
      valueClassName?: string;
      fallback?: string;
    }
  ) => (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0 dark:border-app-border",
        options?.borderClassName
      )}
    >
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn(
          "text-right text-sm font-medium text-slate-900 dark:text-slate-100",
          options?.valueClassName
        )}
      >
        {value ?? options?.fallback ?? "-"}
      </span>
    </div>
  );

  const goToSwapSeats = () => {
    if (!currentDetail) return;

    Modal.confirm({
      title: "Cảnh báo đổi ghế",
      content: "Đã tránh hiện tượng trùng ghế, bạn phải chọn lại toàn bộ ghế cho khách hàng",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        const searchParams = new URLSearchParams({
          callbackUrl: "/order-history/swap-seats",
          id: String(currentDetail.order.id),
          returnTo: `${location.pathname}${location.search}`,
          reopenOrderId: String(currentDetail.order.id)
        });

        navigate(`/showtimes?${searchParams.toString()}`);
      }
    });
  };

  const refreshOrderDetail = async () => {
    if (!currentOrder) return;

    const refreshed = await refetchOrderDetail();
    const latestOrderId = refreshed.data?.order.id ?? currentOrder.id;

    queryClient.invalidateQueries({ queryKey: ordersKeys.all });
    queryClient.invalidateQueries({ queryKey: ordersKeys.getDetail(latestOrderId) });

    return refreshed.data;
  };

  const onCheckPaymentTransaction = async () => {
    if (!currentOrder) return;

    try {
      setIsCheckingPayment(true);
      await ordersApi.checkTransaction({ orderId: currentOrder.id });
      const refreshedOrderDetail = await refreshOrderDetail();

      if (refreshedOrderDetail?.order.paymentStatusId === PaymentStatus.PAID) {
        message.success("Đã cập nhật trạng thái thanh toán thành công");
        return;
      }

      message.warning(
        "Đơn chưa thanh toán. Nếu chắc chắn đơn đã thanh toán, vui lòng ấn Làm mới dữ liệu để cập nhật lại."
      );
    } catch (error) {
      message.error(getApiErrorMessage(error, "Kiểm tra giao dịch thanh toán thất bại"));
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const onChangeStatusOrder = async () => {
    if (!currentOrder) return;

    try {
      setIsChangingToSuccess(true);
      if (currentOrder.paymentStatusId === PaymentStatus.PAID) {
        goToSwapSeats();
        return;
      }

      message.warning("Đơn hàng chưa thanh toán thành công");
    } finally {
      setIsChangingToSuccess(false);
    }
  };

  return (
    <Modal
      title="Thông tin vé bán"
      open={open}
      onCancel={() => onOpenChange(false)}
      width={960}
      style={{ top: 20, paddingBottom: 20 }}
      footer={(_, { CancelBtn }) => (
        <>
          <CancelBtn />
          {currentOrder && (
            <Button onClick={() => void onCheckPaymentTransaction()} loading={isCheckingPayment}>
              Kiểm tra giao dịch thanh toán
            </Button>
          )}
          {canShowChangeToSuccessButton && (
            <Button
              variant="solid"
              color="green"
              onClick={() => void onChangeStatusOrder()}
              loading={isChangingToSuccess}
            >
              Chuyển sang thành công
            </Button>
          )}
        </>
      )}
    >
      <div className="space-y-5 text-slate-900 dark:text-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#fff7ed_100%)] p-5 dark:border-app-border dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.84)_48%,rgba(51,65,85,0.72)_100%)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Đơn hàng{" "}
                <span className="text-black dark:text-white">#{currentOrder?.id ?? "-"}</span>
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                Mã đặt vé: {currentOrder?.barCode ?? "-"}
              </h3>
              {!currentOrder?.isOnline && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Máy bán:{" "}
                  <span className="font-bold text-primary">
                    {currentOrder?.items[0]?.posName || "-"}
                  </span>
                </p>
              )}
            </div>

            {currentOrder && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void refreshOrderDetail()}
                loading={isFetchingOrderDetail && !isCheckingPayment && !isChangingToSuccess}
              >
                Làm mới dữ liệu
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Khách hàng và liên hệ
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Thông tin người mua và trạng thái gửi vé
                </p>
              </div>
            </div>

            <div className="grid gap-x-6 md:grid-cols-2">
              <div>
                {renderInfoRow("Tên khách hàng", customerName)}
                {renderInfoRow("Email", currentOrder?.customerEmail)}
                {renderInfoRow("Số điện thoại", currentOrder?.customerPhone)}
                {renderInfoRow(
                  "Thời gian mua",
                  currentOrder?.createdOnUtc
                    ? dayjs(currentOrder.createdOnUtc).format("HH:mm DD/MM/YYYY")
                    : "-"
                )}
                {renderInfoRow("Kênh thanh toán", currentOrder?.paymentMethodSystemName)}
              </div>
              <div>
                <div className="border-b border-slate-100 py-2 dark:border-app-border">
                  <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                    Trạng thái gửi vé
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Checkbox checked={!!currentOrder?.isEmailSent} disabled>
                      Đã gửi email
                    </Checkbox>
                    <Checkbox checked={!!currentOrder?.isSmsSent} disabled>
                      Đã gửi tin nhắn
                    </Checkbox>
                  </div>
                </div>
                <div className="py-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                      Trạng thái đơn
                    </p>
                    {currentOrder?.orderStatusId && (
                      <OrderStatusBadge status={currentOrder.orderStatusId} type="order" />
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                      Trạng thái thanh toán
                    </p>
                    {currentOrder?.paymentStatusId && (
                      <OrderStatusBadge status={currentOrder.paymentStatusId} type="payment" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {(currentOrder?.cancelTicket || isRefundOrder) && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Thông tin hủy / hoàn tiền
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Chi tiết xử lý đơn hàng sau khi phát sinh hủy hoặc hoàn tiền
                    </p>
                  </div>
                </div>

                <div className="grid gap-x-6 md:grid-cols-2">
                  <div>
                    {renderInfoRow(
                      "Thời gian hủy",
                      currentOrder?.cancelTicket?.createdOnUtc
                        ? dayjs(currentOrder.cancelTicket.createdOnUtc).format("HH:mm DD/MM/YYYY")
                        : "-",
                      {
                        borderClassName: "border-rose-100 dark:border-rose-500/10"
                      }
                    )}
                    {renderInfoRow("Người hủy", currentOrder?.cancelTicket?.userName, {
                      borderClassName: "border-rose-100 dark:border-rose-500/10"
                    })}
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-4 border-b border-rose-100 py-2 dark:border-rose-500/10">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Trạng thái hoàn tiền
                      </span>
                      <div className="text-right">
                        {isRefundOrder ? (
                          <RefundStatusBadge status={currentOrder?.refundStatusId} />
                        ) : (
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            Chưa hoàn tiền
                          </span>
                        )}
                      </div>
                    </div>
                    {renderInfoRow(
                      "Số tiền đã hoàn",
                      formatMoney(currentOrder?.refundedAmount || 0),
                      {
                        borderClassName: "border-rose-100 dark:border-rose-500/10"
                      }
                    )}
                  </div>
                </div>

                <div className="border-t border-rose-100 pt-2 dark:border-rose-500/10">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Lý do hủy</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {currentOrder?.cancelTicket?.reason || "-"}
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Suất chiếu</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Thông tin phim, lịch chiếu và ghế ngồi
              </p>
            </div>

            <div className="grid gap-x-6 md:grid-cols-2">
              <div>
                {renderInfoRow("Tên phim", currentDetail?.film?.filmName)}
                {renderInfoRow("Phòng chiếu", currentDetail?.room?.name)}
                {renderInfoRow(
                  "Ngày chiếu",
                  currentDetail?.planScreening?.projectDate
                    ? dayjs(currentDetail.planScreening.projectDate).format("DD/MM/YYYY")
                    : "-"
                )}
              </div>
              <div>
                {renderInfoRow(
                  "Giờ chiếu",
                  currentDetail?.planScreening?.projectTime
                    ? dayjs(currentDetail.planScreening.projectTime).format("HH:mm")
                    : "-"
                )}
                {renderInfoRow("Số lượng vé", totalTickets)}
                {renderInfoRow("Vị trí ghế", getChairs() || "-")}
              </div>
            </div>
          </section>
        </div>

        {!currentOrder?.isInvitation && (
          <div className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Chương trình khuyến mãi
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Mỗi đơn chỉ áp dụng một loại ưu đãi tại thời điểm thanh toán
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    promotionMode === "campaign" &&
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
                    promotionMode === "ticket" &&
                      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
                    promotionMode === "none" &&
                      "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300"
                  )}
                >
                  {promotionMode === "campaign"
                    ? "Khuyến mãi thành viên"
                    : promotionMode === "ticket"
                      ? "Ưu đãi theo vé"
                      : "Không áp dụng"}
                </div>
              </div>

              {promotionMode === "campaign" && (isU22Voucher || currentOrder?.campaign) ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  {renderInfoRow(
                    "Tên chương trình",
                    isU22Voucher
                      ? "Khuyến mãi giá vé dành cho thành viên U22"
                      : currentOrder?.campaign?.name,
                    {
                      borderClassName: "border-emerald-100 dark:border-emerald-500/20"
                    }
                  )}
                  {renderInfoRow("Mã áp dụng", currentOrder.voucherCode || "Không có mã", {
                    fallback: "Không có mã",
                    borderClassName: "border-emerald-100 dark:border-emerald-500/20"
                  })}
                  {renderInfoRow(
                    "Giá trị khuyến mãi",
                    formatMoney(currentOrder.orderDiscount || 0)
                  )}
                </div>
              ) : null}

              {promotionMode === "ticket" ? (
                <div className="space-y-3">
                  {ticketPromotions.map((promotion) => (
                    <div
                      key={promotion.id}
                      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                            {promotion.name}
                          </p>
                          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                            {getPromotionValue(promotion.type, promotion.rate, promotion.amount)}{" "}
                            cho {promotion.quantity} vé
                          </p>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-900 dark:bg-slate-900/70 dark:text-amber-200">
                          Giảm {formatMoney(promotion.totalDiscount)}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-amber-900 dark:text-amber-200">
                        Ghế áp dụng: {promotion.seats.join(", ") || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {promotionMode === "none" && !currentDetail?.order?.voucherCode ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
                  Đơn hàng này không áp dụng chương trình khuyến mãi.
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Thanh toán
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tóm tắt giá trị trước và sau ưu đãi
                </p>
              </div>

              <div className="space-y-1">
                {renderInfoRow(
                  "Tổng tiền gốc",
                  formatMoney((currentOrder?.orderTotal || 0) + (currentOrder?.orderDiscount || 0))
                )}
                {renderInfoRow(
                  "Khuyến mãi đã áp dụng",
                  `-${formatMoney(currentOrder?.orderDiscount || 0)}`,
                  {
                    valueClassName: "text-rose-600"
                  }
                )}
                {renderInfoRow("Khách cần thanh toán", formatMoney(currentOrder?.orderTotal || 0), {
                  valueClassName: "text-emerald-700 text-base font-semibold"
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OrderDetailDialog;
