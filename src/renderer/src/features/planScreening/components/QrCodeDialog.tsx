import { formatMoney } from "@renderer/lib/utils";
import vietQrImage from "@renderer/assets/images/vietqr.png";
import vnPayImage from "@renderer/assets/images/vnpay2.png";
import { PaymentType, QrDialogData } from "@shared/types";
import { Button, Modal, QRCode } from "antd";
import dayjs from "dayjs";
import { Hourglass } from "lucide-react";
import { useEffect, useState } from "react";
import Countdown from "./Countdown";

interface QrCodeDialogProps {
  open: boolean;
  onCancel?: () => void;
  onCheckTransaction?: () => void;
  dataQr: QrDialogData;
  isCustomerView?: boolean;
  isCheckingTransaction?: boolean;
}

const getQrBrandAsset = (paymentMethodSystemName?: string) => {
  const normalizedValue = paymentMethodSystemName?.replace(/^Payments\./, "").trim();

  if (normalizedValue === PaymentType.VIETQR) {
    return {
      src: vietQrImage,
      alt: "VietQR"
    };
  }

  if (normalizedValue === PaymentType.VNPAY) {
    return {
      src: vnPayImage,
      alt: "VNPayQR"
    };
  }

  return null;
};

const QrCodeDialog = ({
  open,
  onCancel,
  onCheckTransaction,
  dataQr,
  isCustomerView,
  isCheckingTransaction
}: QrCodeDialogProps) => {
  const [expired, setExpired] = useState(false);
  const isU22Voucher = dataQr.voucherCode === "U22Ticket";
  const displayTicketTotal = isU22Voucher
    ? dataQr.orderTotal || 0
    : (dataQr.orderTotal || 0) + (dataQr.orderDiscount || 0);
  const displayDiscount = isU22Voucher ? 0 : dataQr.orderDiscount || 0;
  const qrBrand = getQrBrandAsset(dataQr.paymentMethodSystemName);

  useEffect(() => {
    if (!open) {
      setExpired(false);
    }
  }, [open, dataQr.orderId]);

  return (
    <Modal
      title="Thanh toán QR Code"
      open={open}
      onCancel={onCancel}
      closeIcon={isCustomerView ? false : true}
      width={800}
      centered
      footer={() => {
        return (
          <div className="flex w-full gap-6">
            <div className="text-sm w-3/5 flex items-center justify-between">
              <div className="text-left">
                <div className="flex items-center justify-between">
                  <p className="text-trunks w-25">Tổng tiền vé: </p>{" "}
                  <p className="font-bold text-black dark:text-white">
                    {formatMoney(displayTicketTotal)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-trunks w-25">Giảm giá: </p>
                  <p className="font-bold text-black dark:text-white">
                    {formatMoney(displayDiscount)}
                  </p>
                </div>
              </div>
              <div className="min-w-40 pl-4 text-right">
                <p className="text-sm text-trunks">Tổng thanh toán</p>
                <p className="text-chichi font-bold text-xl mt-1">
                  {formatMoney(dataQr.orderTotal || 0)}
                </p>
              </div>
            </div>
            <div className="w-2/5 flex items-center">
              {!isCustomerView && (
                <div className="flex gap-2 justify-center w-full">
                  <Button onClick={onCancel}>Kết thúc</Button>
                  <Button
                    type="primary"
                    onClick={onCheckTransaction}
                    loading={isCheckingTransaction}
                  >
                    Kiểm tra lại giao dịch TT
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      }}
    >
      <div className="py-2">
        <div className="flex gap-6">
          <div className="w-3/5">
            <div className="bg-goku dark:bg-app-bg-container rounded-lg p-4">
              <p className="font-bold mb-4">Thông tin vé</p>
              <div className="space-y-2">
                <div className="flex justify-between gap-4 text-sm">
                  <p className="w-50 text-trunks">Tên phim đã chọn</p>
                  <p className="flex-1 font-bold">{dataQr.filmName}</p>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <p className="w-50 text-trunks">Vị trí ghế</p>
                  <p className="flex-1 font-bold text-whis">{dataQr.seats}</p>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <p className="w-50 text-trunks">Phòng chiếu</p>
                  <p className="flex-1 font-bold">{dataQr.roomName}</p>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <p className="w-50 text-trunks">Ngày giờ</p>
                  <p className="flex-1 font-bold">
                    {dayjs(dataQr.projectDate).format("DD/MM/YYYY")}-{" "}
                    {dayjs(dataQr.projectTime).format("HH:mm")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-krillin/10 rounded-lg p-4 mt-10 flex items-center justify-between">
              <div>
                <Countdown
                  orderCreatedAt={dataQr.createdOnUtc}
                  expired={expired}
                  setExpired={(value: boolean) => setExpired(value)}
                />
                {expired && (
                  <p className="mt-1 text-sm font-medium text-red-500">
                    Vui lòng kết thúc hoặc check lại giao dịch thanh toán.
                  </p>
                )}
              </div>
              <Hourglass size={36} className="text-krillin" />
            </div>
          </div>
          <div className="w-2/5">
            <div className="flex flex-col items-center">
              {qrBrand && (
                <img
                  src={qrBrand.src}
                  alt={qrBrand.alt}
                  className="mb-4 w-25 h-auto object-contain"
                />
              )}
              <div className="p-5 relative">
                <QRCode value={dataQr.qrcode} size={200} />
                <div className="absolute inset-0 pointer-events-none flex justify-between items-between">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>
                </div>
              </div>

              <p className="text-center font-bold text-base mt-4">{dataQr.orderId}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QrCodeDialog;
