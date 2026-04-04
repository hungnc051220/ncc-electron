import { useMemo, useState } from "react";
import { Button, Input } from "antd";
import { formatMoney } from "@renderer/lib/utils";
import { DiscountProps, ListSeat } from "@shared/types";
import Seat from "@renderer/features/planScreening/components/Seat";
import QrCodeDialog from "@renderer/features/planScreening/components/QrCodeDialog";
import { calculateSeatDiscount } from "@renderer/features/planScreening/components/Actions";

const showtimes = [
  { value: "10:00", label: "10:00 - Phong 1" },
  { value: "13:30", label: "13:30 - Phong 1" }
];

const promoMap: Record<string, DiscountProps> = {
  PROMO10: {
    id: 1,
    discountName: "Promo 10%",
    discountType: "PERCENT",
    discountAmount: 0,
    discountRate: 10,
    deleted: false,
    createdOnUtc: "2026-03-16T00:00:00.000Z",
    createdUser: "e2e",
    updatedOnUtc: "2026-03-16T00:00:00.000Z",
    updatedUser: "e2e"
  },
  FIXED50000: {
    id: 2,
    discountName: "Fixed 50k",
    discountType: "AMOUNT",
    discountAmount: 50000,
    discountRate: 0,
    deleted: false,
    createdOnUtc: "2026-03-16T00:00:00.000Z",
    createdUser: "e2e",
    updatedOnUtc: "2026-03-16T00:00:00.000Z",
    updatedUser: "e2e"
  }
};

const seatCatalog: ListSeat[] = [
  {
    seat: "1",
    rows: 1,
    column: 1,
    y: 1,
    code: "A1",
    type: 0,
    status: 0,
    floor: 1,
    price: 100000,
    checkinStatus: 0,
    isInvitation: 0,
    isContract: 0,
    isHold: 0,
    positionId: 1,
    positionName: "Thuong"
  },
  {
    seat: "2",
    rows: 1,
    column: 2,
    y: 1,
    code: "B1",
    type: 1,
    status: 0,
    floor: 1,
    price: 150000,
    checkinStatus: 0,
    isInvitation: 0,
    isContract: 0,
    isHold: 0,
    positionId: 2,
    positionName: "VIP"
  },
  {
    seat: "3",
    rows: 1,
    column: 3,
    y: 1,
    code: "C1",
    type: 2,
    status: 0,
    floor: 1,
    price: 220000,
    checkinStatus: 0,
    isInvitation: 0,
    isContract: 0,
    isHold: 0,
    positionId: 3,
    positionName: "Couple"
  },
  {
    seat: "4",
    rows: 1,
    column: 4,
    y: 1,
    code: "D1",
    type: 0,
    status: 1,
    floor: 1,
    price: 100000,
    checkinStatus: 0,
    isInvitation: 0,
    isContract: 0,
    isHold: 0,
    positionId: 1,
    positionName: "Thuong"
  }
];

const getSeatKey = (seat: ListSeat) => `${seat.floor}-${seat.seat}`;

const PlanScreeningFlowHarness = () => {
  const [selectedShowtime, setSelectedShowtime] = useState<string>();
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountProps>();
  const [promoError, setPromoError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const toggleSeat = (seat: ListSeat) => {
    if (seat.status === 1) return;

    setSelectedSeats((current) => {
      const seatKey = getSeatKey(seat);
      return current.some((item) => getSeatKey(item) === seatKey)
        ? current.filter((item) => getSeatKey(item) !== seatKey)
        : [...current, seat];
    });
    setPaymentSuccess(false);
  };

  const totalPrice = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
    [selectedSeats]
  );
  const discountAmount = useMemo(
    () =>
      selectedSeats.reduce((sum, seat) => sum + calculateSeatDiscount(seat, appliedDiscount), 0),
    [appliedDiscount, selectedSeats]
  );
  const payable = totalPrice - discountAmount;

  const applyPromo = () => {
    const normalized = promoCode.trim().toUpperCase();
    const promo = promoMap[normalized];

    if (!promo) {
      setAppliedDiscount(undefined);
      setPromoError("Ma giam gia khong hop le");
      return;
    }

    setAppliedDiscount(promo);
    setPromoError("");
  };

  const qrData = {
    orderId: 501,
    qrcode: "vietqr://payload",
    referenceLabelCode: "REF-501",
    accountName: "TRUNG TAM CHIEU PHIM",
    accountNumber: "123456789",
    accountBankName: "VietinBank",
    orderTotal: payable,
    orderDiscount: discountAmount,
    createdOnUtc: "2026-03-16T10:00:00.000Z",
    filmName: "Conan",
    roomName: "Phong 1",
    projectDate: "2026-03-16",
    projectTime: `2026-03-16T${selectedShowtime || "10:00"}:00.000Z`,
    seats: selectedSeats.map((seat) => seat.code).join(", ")
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background:
          "linear-gradient(135deg, rgb(245, 239, 224) 0%, rgb(250, 250, 247) 50%, rgb(223, 235, 244) 100%)",
        fontFamily: "Georgia, serif"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 24 }}>
        <section
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(15,23,42,0.1)",
            borderRadius: 24,
            padding: 24
          }}
        >
          <h1 style={{ fontSize: 40, margin: 0 }}>Plan Screening Checkout</h1>
          <p style={{ color: "#475569", marginTop: 8 }}>
            Harness cho Playwright cover luong chon suat, chon ghe, ap ma va thanh toan QR.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 24
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              borderRadius: 24,
              padding: 24,
              border: "1px solid rgba(15,23,42,0.1)"
            }}
          >
            <label htmlFor="showtime-select" style={{ display: "block", marginBottom: 8 }}>
              Chon suat chieu
            </label>
            <select
              id="showtime-select"
              value={selectedShowtime || ""}
              onChange={(e) => setSelectedShowtime(e.target.value || undefined)}
              style={{
                width: 260,
                height: 38,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "0 12px"
              }}
            >
              <option value="">Chon suat</option>
              {showtimes.map((showtime) => (
                <option key={showtime.value} value={showtime.value}>
                  {showtime.label}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 24 }}>
              <p style={{ marginBottom: 12, fontWeight: 700 }}>Chon ghe</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {seatCatalog.map((seat) => (
                  <div key={getSeatKey(seat)} style={{ display: "grid", gap: 8 }}>
                    <Seat
                      seat={seat}
                      isSelected={selectedSeats.some(
                        (item) => getSeatKey(item) === getSeatKey(seat)
                      )}
                      onSelect={toggleSeat}
                      size={64}
                      canSelect={seat.status !== 1}
                    />
                    <span data-testid={`seat-price-${seat.code}`} style={{ fontSize: 12 }}>
                      {seat.positionName} - {formatMoney(seat.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              background: "rgba(12, 24, 36, 0.94)",
              color: "white",
              borderRadius: 24,
              padding: 24
            }}
          >
            <p style={{ marginTop: 0, fontSize: 24, fontWeight: 700 }}>Thanh toan</p>
            <div style={{ display: "grid", gap: 12 }}>
              <label htmlFor="promo-code">Ma giam gia</label>
              <Input
                id="promo-code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="PROMO10 / FIXED50000"
              />
              <Button onClick={applyPromo}>Ap dung ma</Button>
              {promoError ? (
                <p data-testid="promo-error" style={{ color: "#fca5a5", margin: 0 }}>
                  {promoError}
                </p>
              ) : null}
            </div>

            <div style={{ marginTop: 24, display: "grid", gap: 8 }}>
              <div data-testid="selected-showtime">Suat: {selectedShowtime || "Chua chon"}</div>
              <div data-testid="selected-seats">
                Ghe: {selectedSeats.map((seat) => seat.code).join(", ") || "Chua chon"}
              </div>
              <div data-testid="ticket-total">Tong ve: {formatMoney(totalPrice)}</div>
              <div data-testid="discount-total">Giam gia: {formatMoney(discountAmount)}</div>
              <div data-testid="payable-total">Thanh toan: {formatMoney(payable)}</div>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button
                type="primary"
                disabled={!selectedShowtime || selectedSeats.length === 0}
                onClick={() => {
                  setQrOpen(true);
                  setPaymentSuccess(false);
                }}
              >
                Thanh toan QR
              </Button>
              <Button
                disabled={!qrOpen}
                style={
                  qrOpen
                    ? {
                        position: "fixed",
                        right: 24,
                        bottom: 24,
                        zIndex: 2000
                      }
                    : undefined
                }
                onClick={() => {
                  setQrOpen(false);
                  setPaymentSuccess(true);
                }}
              >
                Gia lap thanh toan thanh cong
              </Button>
            </div>

            {paymentSuccess ? (
              <div
                data-testid="payment-success"
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(34,197,94,0.18)"
                }}
              >
                Thanh toan thanh cong
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <QrCodeDialog open={qrOpen} onCancel={() => setQrOpen(false)} dataQr={qrData} />
    </main>
  );
};

export default PlanScreeningFlowHarness;
