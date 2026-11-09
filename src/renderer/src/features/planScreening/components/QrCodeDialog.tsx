// Màn "Thanh toán QR Code": hai cột cao bằng nhau, vừa màn 1366×768 không cần cuộn.
// Trái: Thông tin vé, Chi tiết thanh toán (tiền vé, mã giảm giá, voucher giấy, số cần thu), thời gian chờ (đồng hồ
// cát động). Phải: khung QR (mã / lỗi tạo QR có nút "Tạo lại QR" ngay trong khung / đang tạo lại) và hai nút thao tác.
import AnimatedHourglass from "@renderer/components/AnimatedHourglass";
import { formatMoney, resolvePaymentType } from "@renderer/lib/utils";
import vietQrImage from "@renderer/assets/images/vietqr.png";
import vnPayImage from "@renderer/assets/images/vnpay2.png";
import { PaymentType, QrDialogData } from "@shared/types";
import { Button, Modal, QRCode, Tag } from "antd";
import dayjs from "dayjs";
import {
  QrCode,
  ReceiptText,
  RefreshCw,
  SearchCheck,
  Ticket,
  TicketPercent,
  X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import Countdown from "./Countdown";
import { getQrPayableAmount } from "./paperVoucherSale";

interface QrCodeDialogProps {
  open: boolean;
  onCancel?: () => void;
  onCheckTransaction?: () => void;
  dataQr: QrDialogData;
  isCustomerView?: boolean;
  isCheckingTransaction?: boolean;
  /** Đang gửi "Kết thúc": khóa nút để không gửi hai lần. */
  isClosing?: boolean;
  /**
   * Đơn có voucher giấy chưa có QR (tạo QR lỗi tạm thời / chưa rõ kết quả): câu ngắn hiện dưới khung QR,
   * nút "Tạo lại QR" nằm trong khung. Không có giá trị = QR đã sẵn sàng.
   */
  qrUnavailableMessage?: string;
  onRetryCreateQr?: () => void;
  /** Đang tạo (lại) QR: khung QR hiện trạng thái chờ thay cho lỗi. */
  isRetryingQr?: boolean;
}

const getQrBrandAsset = (paymentMethodSystemName?: string) => {
  const paymentType = resolvePaymentType(paymentMethodSystemName);

  if (paymentType === PaymentType.VIETQR) {
    return { src: vietQrImage, alt: "VietQR" };
  }

  if (paymentType === PaymentType.VNPAY) {
    return { src: vnPayImage, alt: "VNPayQR" };
  }

  return null;
};

const QrFrameCorners = ({ isError }: { isError: boolean }) => {
  const color = isError ? "border-red-500 dark:border-red-400" : "border-primary";
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className={`absolute top-0 left-0 h-6 w-6 rounded-tl-2xl border-t-4 border-l-4 ${color}`}
      />
      <div
        className={`absolute top-0 right-0 h-6 w-6 rounded-tr-2xl border-t-4 border-r-4 ${color}`}
      />
      <div
        className={`absolute bottom-0 left-0 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 ${color}`}
      />
      <div
        className={`absolute right-0 bottom-0 h-6 w-6 rounded-br-2xl border-r-4 border-b-4 ${color}`}
      />
    </div>
  );
};

const SectionTitle = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <p className="mb-3 flex items-center gap-2 font-semibold text-black dark:text-white">
    <span className="text-primary dark:text-indigo-300">{icon}</span>
    {children}
  </p>
);

/** Dòng thông tin vé; giá trị dài (tên phim, nhiều ghế) tối đa 2 dòng để màn QR không cao quá màn hình. */
const InfoRow = ({
  label,
  value,
  valueClassName = ""
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm">
    <span className="text-trunks dark:text-white/60">{label}</span>
    <span
      title={value}
      className={`line-clamp-2 font-semibold text-black dark:text-white ${valueClassName}`}
    >
      {value}
    </span>
  </div>
);

const MoneyRow = ({
  label,
  amount,
  isDeduction,
  testId
}: {
  label: ReactNode;
  amount: number;
  isDeduction?: boolean;
  testId?: string;
}) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-trunks dark:text-white/65">
      {label}
    </span>
    <span
      className={`shrink-0 font-semibold tabular-nums ${
        isDeduction ? "text-emerald-600 dark:text-emerald-400" : "text-black dark:text-white"
      }`}
    >
      {isDeduction && "−"}
      <span data-testid={testId}>{formatMoney(amount)}</span>
    </span>
  </div>
);

const CodeTag = ({ children }: { children: ReactNode }) => (
  <Tag variant="filled" className="m-0! rounded-md! px-1.5! text-xs! font-semibold!">
    {children}
  </Tag>
);

const getDiscountLabel = (voucherCode?: string) => {
  if (voucherCode === "PointReward") return { label: "Đổi điểm", code: undefined };
  if (voucherCode) return { label: "Mã giảm giá", code: voucherCode };
  return { label: "Giảm giá", code: undefined };
};

const QrCodeDialog = ({
  open,
  onCancel,
  onCheckTransaction,
  dataQr,
  isCustomerView,
  isCheckingTransaction,
  isClosing,
  qrUnavailableMessage,
  onRetryCreateQr,
  isRetryingQr
}: QrCodeDialogProps) => {
  const [expired, setExpired] = useState(false);
  // Đơn U22: giá vé đã là giá U22 (OrderTotal), không có dòng giảm giá riêng.
  const isU22Voucher = dataQr.voucherCode === "U22Ticket";
  const discount = isU22Voucher ? 0 : dataQr.orderDiscount || 0;
  const ticketAmount = (dataQr.orderTotal || 0) + discount;
  const seatCount = dataQr.seats ? dataQr.seats.split(",").filter((seat) => seat.trim()).length : 0;
  const discountLabel = getDiscountLabel(dataQr.voucherCode);
  const qrBrand = getQrBrandAsset(dataQr.paymentMethodSystemName);
  // Đơn có voucher giấy: QR chỉ thu phần còn lại sau voucher.
  const paperVoucher = dataQr.paperVoucher;
  const payableAmount = getQrPayableAmount(dataQr);
  const isQrUnavailable = !!qrUnavailableMessage;
  const isQrError = isQrUnavailable && !isRetryingQr;
  const isBusy = !!(isCheckingTransaction || isClosing || isRetryingQr);

  useEffect(() => {
    if (!open) {
      setExpired(false);
    }
  }, [open, dataQr.orderId]);

  const ticketCard = (
    <section className="rounded-xl bg-goku p-4 dark:bg-app-bg-container">
      <SectionTitle icon={<Ticket size={18} />}>Thông tin vé</SectionTitle>
      <div className="space-y-2">
        <InfoRow label="Phim" value={dataQr.filmName} />
        <InfoRow label="Ghế" value={dataQr.seats} valueClassName="!text-whis" />
        <InfoRow label="Phòng chiếu" value={dataQr.roomName} />
        <InfoRow
          label="Suất chiếu"
          value={`${dayjs(dataQr.projectTime).format("HH:mm")} · ${dayjs(dataQr.projectDate).format("DD/MM/YYYY")}`}
        />
      </div>
    </section>
  );

  const paymentCard = (
    <section className="flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
      <div className="space-y-2.5 p-4">
        <SectionTitle icon={<ReceiptText size={18} />}>Chi tiết thanh toán</SectionTitle>
        <MoneyRow
          label={
            <>
              Tiền vé
              {seatCount > 0 && <span className="text-xs text-gray-400">· {seatCount} ghế</span>}
            </>
          }
          amount={ticketAmount}
          testId="qr-ticket-total"
        />
        {discount > 0 && (
          <MoneyRow
            label={
              <>
                {discountLabel.label}
                {discountLabel.code && <CodeTag>{discountLabel.code}</CodeTag>}
              </>
            }
            amount={discount}
            isDeduction
            testId="qr-discount"
          />
        )}
        {paperVoucher && (
          <MoneyRow
            label={
              <>
                <span className="inline-flex items-center gap-1.5">
                  <TicketPercent
                    size={16}
                    className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  Voucher giấy
                </span>
                {paperVoucher.lines?.map((line) => (
                  <CodeTag key={line.batchCode}>
                    {line.batchCode} ×{line.quantity}
                  </CodeTag>
                ))}
              </>
            }
            amount={paperVoucher.voucherApplied}
            isDeduction
            testId="qr-paper-voucher-applied"
          />
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-4 border-t border-primary/15 bg-primary/5 px-4 py-3 dark:border-white/10 dark:bg-primary/15">
        <span className="font-semibold text-black dark:text-white">
          {paperVoucher ? "Cần thanh toán thêm" : "Tổng thanh toán"}
        </span>
        <span
          data-testid="qr-payable-amount"
          className="text-2xl font-bold tabular-nums text-primary dark:text-indigo-300"
        >
          {formatMoney(payableAmount)}
        </span>
      </div>
    </section>
  );

  const waitingCard = (
    <section
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        expired ? "bg-red-50 dark:bg-red-500/10" : "bg-krillin/10"
      }`}
    >
      <AnimatedHourglass
        size={34}
        paused={expired}
        className={expired ? "text-red-500" : "text-amber-700 dark:text-amber-300"}
      />
      <div className="min-w-0 flex-1">
        {expired ? (
          <>
            <p className="font-semibold text-red-600 dark:text-red-400">
              Hết thời gian chờ thanh toán
            </p>
            <p className="text-[13px] text-trunks dark:text-white/65">
              Vui lòng kiểm tra lại giao dịch hoặc kết thúc.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-black dark:text-white">Đang chờ khách thanh toán</p>
            <p className="text-[13px] text-trunks dark:text-white/65">Mã QR hết hạn sau 5 phút</p>
          </>
        )}
      </div>
      <Countdown
        orderCreatedAt={dataQr.createdOnUtc}
        expired={expired}
        setExpired={(value: boolean) => setExpired(value)}
      />
    </section>
  );

  const qrUnavailableBox = isQrError ? (
    <div className="flex h-50 w-50 flex-col items-center justify-center gap-7 rounded-md bg-red-50 ring-1 ring-red-200 dark:bg-red-500/10 dark:ring-red-400/30">
      {/* Mã QR gạch chéo: chưa có mã để quét. */}
      <span className="relative">
        <QrCode size={72} strokeWidth={1.4} className="text-red-300 dark:text-red-300/60" />
        <span className="absolute -right-2 -bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white ring-4 ring-red-50 dark:ring-[#2a1618]">
          <X size={16} strokeWidth={3} />
        </span>
      </span>
      {onRetryCreateQr && (
        <button
          type="button"
          onClick={onRetryCreateQr}
          disabled={isBusy}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-primary/30 transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-indigo-200 dark:ring-white/20"
        >
          <RefreshCw size={16} strokeWidth={2.5} aria-hidden />
          Tạo lại QR
        </button>
      )}
    </div>
  ) : (
    <div className="flex h-50 w-50 flex-col items-center justify-center gap-3 rounded-md bg-goku dark:bg-app-bg-container">
      <RefreshCw
        size={40}
        strokeWidth={2}
        className="animate-spin text-primary dark:text-indigo-300"
      />
      <span className="text-sm font-medium text-trunks dark:text-white/70">Đang tạo lại QR…</span>
    </div>
  );

  const qrCaption = isQrError ? (
    <>
      <p className="font-semibold text-red-600 dark:text-red-400">Không tạo được mã QR</p>
      <p
        title={qrUnavailableMessage}
        className="mt-0.5 line-clamp-2 text-[13px] text-trunks dark:text-white/65"
      >
        {qrUnavailableMessage}
      </p>
    </>
  ) : (
    <p className="text-[13px] text-trunks dark:text-white/65">
      {isRetryingQr ? "Vui lòng chờ trong giây lát" : "Quét mã bằng ứng dụng ngân hàng"}
    </p>
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-3 pr-8">
          <span>Thanh toán QR Code</span>
          <Tag variant="filled" color="purple" className="m-0! font-semibold!">
            Đơn #{dataQr.orderId}
          </Tag>
        </div>
      }
      open={open}
      onCancel={onCancel}
      closeIcon={isCustomerView ? false : true}
      width="min(880px, calc(100vw - 32px))"
      centered
      mask={{ closable: false }}
      footer={null}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-stretch gap-5 pt-2">
        <div className="flex min-w-0 flex-col gap-4">
          {ticketCard}
          {paymentCard}
          {waitingCard}
        </div>
        <aside className="flex flex-col items-center rounded-xl border border-gray-200 p-4 dark:border-white/10">
          {qrBrand && (
            <img src={qrBrand.src} alt={qrBrand.alt} className="h-7 w-auto object-contain" />
          )}
          <div
            data-testid={isQrUnavailable ? "qr-unavailable" : undefined}
            className="flex w-full flex-col items-center"
          >
            <div className="relative mt-3 p-4">
              {isQrUnavailable ? (
                qrUnavailableBox
              ) : (
                <QRCode value={dataQr.qrcode} size={200} bordered={false} />
              )}
              <QrFrameCorners isError={isQrError} />
            </div>
            <div className="mt-2 w-full px-1 text-center">{qrCaption}</div>
          </div>
          {!isCustomerView && (
            <div className="mt-auto flex w-full flex-col gap-2 pt-4">
              <Button
                type="primary"
                size="large"
                block
                icon={<SearchCheck size={18} />}
                onClick={onCheckTransaction}
                loading={isCheckingTransaction}
                disabled={isBusy && !isCheckingTransaction}
              >
                Kiểm tra lại giao dịch TT
              </Button>
              <Button
                size="large"
                block
                onClick={onCancel}
                loading={isClosing}
                disabled={isBusy && !isClosing}
              >
                Kết thúc
              </Button>
            </div>
          )}
        </aside>
      </div>
    </Modal>
  );
};

export default QrCodeDialog;
