import { OrderStatusBadge } from "@renderer/components/OrderStatusBadge";
import { useUpdateOrder } from "@renderer/hooks/orders/useUpdateOrder";
import { formatMoney } from "@renderer/lib/utils";
import { ApiError, OrderDetailProps, OrderStatus, PaymentStatus } from "@shared/types";
import { Button, Checkbox, message, Modal } from "antd";
import axios from "axios";
import dayjs from "dayjs";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: OrderDetailProps | null;
}

const OrderHistoryDialog = ({ open, onOpenChange, selectedItem }: OrderDialogProps) => {
  const updateStatusOrder = useUpdateOrder();

  const getChairs = () => {
    const chairsF1 = selectedItem?.order?.items?.map((item) => item.listChairValueF1) || [];
    const chairsF2 = selectedItem?.order?.items?.map((item) => item.listChairValueF2) || [];
    const chairsF3 = selectedItem?.order?.items?.map((item) => item.listChairValueF3) || [];
    const allChairs = [...chairsF1, ...chairsF2, ...chairsF3].filter(Boolean);
    return allChairs.join(", ");
  };

  const onChangeStatusOrder = () => {
    if (!selectedItem) return;
    updateStatusOrder.mutate(
      {
        id: selectedItem?.order.id,
        dto: {
          orderStatusId: OrderStatus.COMPLETED,
          paymentStatusId: PaymentStatus.PAID,
          shippingStatusId: selectedItem.order.shippingStatusId
        }
      },
      {
        onSuccess: () => {
          message.success("Thay đổi trạng thái đơn hàng thành công");
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          let msg = "Thay đổi trạng thái đơn hàng thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

  return (
    <Modal
      title="Thông tin vé bán"
      open={open}
      onCancel={() => onOpenChange(false)}
      width={800}
      footer={(_, { CancelBtn }) => (
        <>
          <CancelBtn />
          {selectedItem?.order.paymentStatusId !== PaymentStatus.PAID && (
            <Button
              variant="solid"
              color="green"
              onClick={onChangeStatusOrder}
              loading={updateStatusOrder.isPending}
            >
              Chuyển sang thành công
            </Button>
          )}
        </>
      )}
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Order Info-Merchant ID</p>
          <p>{selectedItem?.order.id || "-"}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Mã Barcode</p>
          <p>{selectedItem?.order.barCode || "-"}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Người mua vé</p>
          <p className="uppercase">{selectedItem?.order.customerFirstName || "-"}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Email</p>
          <p>{selectedItem?.order.customerEmail || "-"}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Số điện thoại</p>
          <p>{selectedItem?.order.customerPhone || "-"}</p>
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
            {selectedItem?.order.createdOnUtc &&
              dayjs(selectedItem?.order.createdOnUtc).format("DD/MM/YYYY")}
          </p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Tên phim</p>
          <p>{selectedItem?.film?.filmName}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Ngày chiếu</p>
          <p>
            {selectedItem?.planScreening?.projectDate &&
              dayjs(selectedItem?.planScreening?.projectDate).format("DD/MM/YYYY")}
          </p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Giờ chiếu</p>
          {selectedItem?.planScreening?.projectTime &&
            dayjs(selectedItem?.planScreening?.projectTime).format("HH:mm")}
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Số lượng vé</p>
          <p>{selectedItem?.order.items.reduce((a, b) => a + b.quantity, 0)}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-sm text-trunks">Vị trí ghế</p>
          <p>{getChairs()}</p>
        </div>
        {!selectedItem?.order.isInvitation && (
          <>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Tiền thanh toán</p>
              <p className="font-bold">{formatMoney(selectedItem?.order.orderTotal || 0)}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks mb-1">Trạng thái thanh toán</p>
              {selectedItem?.order.paymentStatusId && (
                <OrderStatusBadge status={selectedItem?.order.paymentStatusId} type="payment" />
              )}
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks mb-1">Trạng thái đơn</p>
              {selectedItem?.order.orderStatusId && (
                <OrderStatusBadge status={selectedItem?.order.orderStatusId} type="order" />
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default OrderHistoryDialog;
