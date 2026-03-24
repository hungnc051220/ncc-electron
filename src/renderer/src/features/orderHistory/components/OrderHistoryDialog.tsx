import { ordersApi } from "@renderer/api/orders.api";
import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useOrderDetail } from "@renderer/hooks/orders/useOrderDetail";
import { formatMoney } from "@renderer/lib/utils";
import RefundStatusBadge from "@renderer/features/refunds/components/RefundStatusBadge";
import { OrderDetailProps, PaymentStatus } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, Modal, message } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: OrderDetailProps | null;
}

const OrderHistoryDialog = ({ open, onOpenChange, selectedItem }: OrderDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const {
    data: orderDetail,
    isFetching: isFetchingOrderDetail,
    refetch: refetchOrderDetail
  } = useOrderDetail(selectedItem?.order.id ?? 0);

  const currentDetail = orderDetail ?? selectedItem ?? null;
  const currentOrder = currentDetail?.order;

  const isVietQrPayment = useMemo(() => {
    const paymentMethodSystemName = currentOrder?.paymentMethodSystemName?.toLowerCase() ?? "";
    return paymentMethodSystemName.includes("vietqr");
  }, [currentOrder?.paymentMethodSystemName]);
  const isRefundOrder = currentOrder?.refundStatusId != null;

  const getChairs = () => {
    const chairsF1 = currentOrder?.items?.map((item) => item.listChairValueF1) || [];
    const chairsF2 = currentOrder?.items?.map((item) => item.listChairValueF2) || [];
    const chairsF3 = currentOrder?.items?.map((item) => item.listChairValueF3) || [];
    const allChairs = [...chairsF1, ...chairsF2, ...chairsF3].filter(Boolean);
    return allChairs.join(", ");
  };

  const goToSwapSeats = () => {
    if (!currentDetail) return;

    Modal.confirm({
      title: "Cảnh báo đổi ghế",
      content: "Đã tránh hiện tượng trùng ghế, bạn phải chọn lại toàn bộ ghế cho khách hàng",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        onOpenChange(false);
        const searchParams = new URLSearchParams({
          callbackUrl: "/order-history/swap-seats",
          id: String(currentDetail.order.id),
          returnTo: `${location.pathname}${location.search}`
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

  const onChangeStatusOrder = async () => {
    if (!currentOrder) return;

    if (isVietQrPayment) {
      try {
        setIsCheckingPayment(true);
        await ordersApi.checkTransaction({ orderId: currentOrder.id });
        const refreshedOrderDetail = await refreshOrderDetail();

        if (refreshedOrderDetail?.order.paymentStatusId === PaymentStatus.PAID) {
          goToSwapSeats();
          return;
        }

        message.warning(
          "Đơn chưa thanh toán, không thể chuyển vé. Nếu chắc chắn đơn đã thanh toán, vui lòng ấn Làm mới dữ liệu để cập nhật lại."
        );
        return;
      } catch {
        message.error("Kiểm tra thanh toán VietQR thất bại");
        return;
      } finally {
        setIsCheckingPayment(false);
      }
    }

    if (currentOrder.paymentStatusId === PaymentStatus.PAID) {
      goToSwapSeats();
      return;
    }

    message.warning("Đơn hàng chưa thanh toán thành công");
  };

  return (
    <Modal
      title="Thông tin vé bán"
      open={open}
      onCancel={() => onOpenChange(false)}
      width={800}
      footer={(_, { CancelBtn }) => (
        <>
          {currentOrder && (
            <Button
              onClick={() => void refreshOrderDetail()}
              loading={isFetchingOrderDetail && !isCheckingPayment}
            >
              Làm mới dữ liệu
            </Button>
          )}
          <CancelBtn />
          {currentOrder &&
            (currentOrder.paymentStatusId === PaymentStatus.PAID || isVietQrPayment) && (
              <Button
                variant="solid"
                color="green"
                onClick={() => void onChangeStatusOrder()}
                loading={isCheckingPayment}
              >
                Chuyển sang thành công
              </Button>
            )}
        </>
      )}
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Mã thanh toán</p>
          <p>{currentOrder?.id || "-"}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Mã vé</p>
          <p>{currentOrder?.barCode || "-"}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Người mua vé</p>
          <p className="uppercase">{currentOrder?.customerFirstName || "-"}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Email</p>
          <p>{currentOrder?.customerEmail || "-"}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Số điện thoại</p>
          <p>{currentOrder?.customerPhone || "-"}</p>
        </div>
        <div className="space-y-2 py-3 px-4">
          <div className="flex items-center gap-2">
            <Checkbox id="email">Đã gửi email</Checkbox>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sms">Đã gửi tin nhắn</Checkbox>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 bg-app-bg-container mt-4 rounded-md">
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Ngày mua</p>
          <p>
            {currentOrder?.createdOnUtc && dayjs(currentOrder.createdOnUtc).format("DD/MM/YYYY")}
          </p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Tên phim</p>
          <p>{currentDetail?.film?.filmName}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Phòng chiếu</p>
          <p>{currentDetail?.room?.name}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Ngày chiếu</p>
          <p>
            {currentDetail?.planScreening?.projectDate &&
              dayjs(currentDetail.planScreening.projectDate).format("DD/MM/YYYY")}
          </p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Giờ chiếu</p>
          {currentDetail?.planScreening?.projectTime &&
            dayjs(currentDetail.planScreening.projectTime).format("HH:mm")}
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Số lượng vé</p>
          <p>{currentOrder?.items.reduce((a, b) => a + b.quantity, 0)}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Vị trí ghế</p>
          <p>{getChairs()}</p>
        </div>
        {!currentOrder?.isInvitation && (
          <>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Tiền thanh toán</p>
              <p className="font-bold">{formatMoney(currentOrder?.orderTotal || 0)}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Kênh thanh toán</p>
              <p className="font-bold">{currentOrder?.paymentMethodSystemName}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks mb-1">
                {isRefundOrder ? "Số tiền đã hoàn" : "Trạng thái thanh toán"}
              </p>
              {isRefundOrder ? (
                <p className="font-bold">{formatMoney(currentOrder?.refundedAmount || 0)}</p>
              ) : (
                currentOrder?.paymentStatusId && (
                  <OrderStatusBadge status={currentOrder.paymentStatusId} type="payment" />
                )
              )}
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks mb-1">
                {isRefundOrder ? "Trạng thái xử lý" : "Trạng thái đơn"}
              </p>
              {isRefundOrder ? (
                <RefundStatusBadge status={currentOrder?.refundStatusId} />
              ) : (
                currentOrder?.orderStatusId && (
                  <OrderStatusBadge status={currentOrder.orderStatusId} type="order" />
                )
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default OrderHistoryDialog;
