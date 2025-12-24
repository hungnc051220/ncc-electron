export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getOrderDetail } from "@/data/loaders";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";
import Image from "next/image";
import { notFound } from "next/navigation";

interface TicketPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ itemIndex?: string; seatIndex?: string }>;
}

const TicketPage = async ({ params, searchParams }: TicketPageProps) => {
  const slug = (await params).slug;
  const { itemIndex, seatIndex } = await searchParams;

  if (!slug) {
    notFound();
  }

  const ticket = await getOrderDetail(Number(slug));

  if (!ticket) return null;

  // Xác định item và seat cần hiển thị
  const itemIdx = itemIndex ? parseInt(itemIndex, 10) : 0;
  const currentItem = ticket.order.items[itemIdx];

  if (!currentItem) return null;

  // Tách từng ghế từ listChairValueF1 (hỗ trợ F1, F2, F3)
  const getSeatsList = (item: typeof currentItem): string[] => {
    const seatsF1 = item.listChairValueF1
      ? item.listChairValueF1.split(",").map((s) => s.trim())
      : [];
    const seatsF2 = item.listChairValueF2
      ? item.listChairValueF2.split(",").map((s) => s.trim())
      : [];
    const seatsF3 = item.listChairValueF3
      ? item.listChairValueF3.split(",").map((s) => s.trim())
      : [];
    return [...seatsF1, ...seatsF2, ...seatsF3].filter(Boolean);
  };

  const seatsList = getSeatsList(currentItem);
  const seatIdx = seatIndex ? parseInt(seatIndex, 10) : 0;
  const currentSeat = seatsList[seatIdx] || seatsList[0] || "";

  // Tính giá vé cho từng ghế (chia đều giá item cho số lượng ghế)
  const pricePerSeat =
    seatsList.length > 0
      ? Math.round(currentItem.priceInclTax / seatsList.length)
      : currentItem.priceInclTax;

  return (
    <>
      <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Tahoma, sans-serif;
            font-size: 12px;
            color: #000;
          }

          .ticket {
            width: 80mm;
            padding: 8px 16px;
          }

          .center {
            text-align: center;
          }

          .bold {
            font-weight: 700;
          }

          .title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .ticket-title {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 10px;
            text-align: center;
          }

          .sub {
            font-size: 11px;
            margin-top: 2px;
          }

          .info-wrapper {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px 16px;
            margin-top: 8px;
          }

          .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .label {
            font-size: 12px;
            font-weight: 600;
          }

          .label-footer {
            font-size: 11px;
            font-weight: 600;
          }

          .en-label {
            font-size: 10px;
          }

          .value {
            font-size: 14px;
            font-weight: 600;
          }

          .movie {
            text-align: center;
            text-transform: uppercase;
          }

          .qr {
            text-align: center;
            margin-top: 8px;
          }

          .qr img {
            margin-left: auto;
            margin-right: auto;
          }

          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 6px;
          }

          .flex-center {
            display: flex;
            justify-content: center;
            align-items: center;
          }

          @media print {
            body {
              margin: 0;
            }
          }
        `}</style>

      <div className="ticket">
        {/* HEADER */}
        <div className="center">
          <div className="title">TRUNG TÂM CHIẾU PHIM QUỐC GIA</div>
          <div>NATIONAL CINEMA CENTER</div>
          <div className="sub">Số 87 Láng Hạ, Ba Đình, Hà Nội</div>
        </div>

        <div className="ticket-title">VÉ XEM PHIM (TICKET)</div>

        {/* MOVIE */}
        <div className="movie">{ticket.film.filmName}</div>

        <div className="info-wrapper">
          <div className="row">
            <div>
              <span className="label">Giờ:</span>
              <p className="en-label">Time:</p>
            </div>
            <span className="value">
              {format(ticket.planScreening.projectTime, "HH:mm")}
            </span>
          </div>

          <div className="row">
            <div>
              <span className="label">Ghế:</span>
              <p className="en-label">Seat:</p>
            </div>
            <span className="value">{currentSeat}</span>
          </div>

          <div className="row">
            <div>
              <span className="label">Ngày:</span>
              <p className="en-label">Date:</p>
            </div>
            <span className="value">
              {format(ticket.planScreening.projectDate, "dd/MM/yyyy")}
            </span>
          </div>

          <div className="row">
            <div>
              <span className="label">Phòng:</span>
              <p className="en-label">Room:</p>
            </div>
            <span className="value">{ticket.room.name}</span>
          </div>

          <div className="row">
            <div>
              <span className="label">Giá vé:</span>
              <p className="en-label">Price:</p>
            </div>
            <span className="value">{formatMoney(pricePerSeat)}đ</span>
          </div>

          <div className="center value flex-center">
            Tầng {ticket.room.floor}
          </div>

          <div className="bold flex-center value">
            Mã vé: {ticket.order.barCode}
          </div>

          <div className="qr">
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${ticket.order.barCode}`}
              alt="qr"
              width={100}
              height={100}
            />
          </div>
        </div>

        <div className="footer">www.chieuphimquocgia.com.vn</div>
        <div className="info-wrapper">
          <div className="row">
            <span className="en-label">Máy bán:</span>
            <span className="label-footer">M4-202112</span>
          </div>
          <div className="row">
            <span className="bold">{format(new Date(), "dd/MM/yyyy")}</span>
            <span className="bold">{format(new Date(), "HH:mm")}</span>
          </div>
          <div className="row">
            <span className="en-label">Nhân viên:</span>
            <span className="label-footer">Hưng</span>
          </div>
          <div className="row">
            <span className="en-label">Hotline:</span>
            <span className="label-footer">024.35141791</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default TicketPage;
