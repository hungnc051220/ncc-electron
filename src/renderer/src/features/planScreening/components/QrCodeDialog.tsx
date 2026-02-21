import { formatMoney } from "@renderer/lib/utils";
import { QrDialogData } from "@shared/types";
import { Modal, QRCode } from "antd";
import dayjs from "dayjs";
import { Hourglass } from "lucide-react";
import { useEffect, useState } from "react";
import Countdown from "./Countdown";

interface QrCodeDialogProps {
  open: boolean;
  onCancel?: () => void;
  dataQr: QrDialogData;
  isCustomerView?: boolean;
}

const QrCodeDialog = ({ open, onCancel, dataQr, isCustomerView }: QrCodeDialogProps) => {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (expired && open && onCancel) {
      onCancel();
    }
  }, [expired, onCancel, open]);

  return (
    <Modal
      title="Thanh toán QR Code"
      open={open}
      onCancel={onCancel}
      closeIcon={isCustomerView ? false : true}
      width={800}
      centered
      footer={() => (
        <div className="flex w-full gap-6">
          <div className="w-3/5 text-sm">
            <p className="text-trunks">
              Tổng tiền vé:{" "}
              <span className="font-bold text-black dark:text-white">
                {formatMoney((dataQr.orderTotal || 0) + (dataQr.orderDiscount || 0))}
              </span>
            </p>
            <p className="text-trunks mt-1">
              Giảm giá:{" "}
              <span className="font-bold text-black dark:text-white">
                {formatMoney(dataQr.orderDiscount || 0)}
              </span>
            </p>
          </div>
          <div className="w-2/5 pl-4">
            <p className="text-sm text-trunks">Tổng thanh toán</p>
            <p className="text-chichi font-bold text-xl mt-1">
              {formatMoney(dataQr.orderTotal || 0)}
            </p>
          </div>
        </div>
      )}
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
                    {dayjs(dataQr.projectTime).utc().format("HH:mm")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-krillin/10 rounded-lg p-4 mt-10 flex items-center justify-between">
              <Countdown
                orderCreatedAt={dataQr.createdOnUtc}
                expired={expired}
                setExpired={(value: boolean) => setExpired(value)}
              />
              <Hourglass size={36} className="text-krillin" />
            </div>
          </div>
          <div className="w-2/5">
            <div className="flex flex-col items-center">
              <div className="p-5 relative">
                <QRCode value={dataQr.qrcode} size={200} />
                <div className="absolute inset-0 pointer-events-none flex justify-between items-between">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>
                </div>
              </div>

              <p className="text-center font-bold text-base mt-4">{dataQr.accountNumber}</p>
              <p className="text-center font-bold text-base">{dataQr.accountName}</p>
              <p className="text-center font-bold text-base">{dataQr.accountBankName}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QrCodeDialog;
