import { ListSeat, OrderDetailProps, PaymentType, PrintTicketPayload } from "@shared/types";
import {
  DEFAULT_BRANCH_SETTINGS,
  useSettingBranchStore
} from "@renderer/store/settingBranch.store";
import type { InputNumberProps } from "antd";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import QRCode from "qrcode";

const U22_TICKET_VOUCHER_CODE = "U22Ticket";
const U22_TICKET_IMAGE_URL = new URL("../assets/images/u22-ticket.png", import.meta.url).href;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const decodeToken = (token: string) => {
  try {
    const base64Url = token.split(".")[1];

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const formatMoney = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

export const resolvePaymentType = (value?: string | null): PaymentType | undefined => {
  if (!value) return undefined;

  const normalizedValue = value.trim();
  const strippedValue = normalizedValue.replace(/^Payments\./, "");

  const paymentTypeAliases: Record<PaymentType, string[]> = {
    [PaymentType.POS]: [PaymentType.POS, "POS"],
    [PaymentType.VNPAY]: [
      PaymentType.VNPAY,
      PaymentType.VNPAY.replace(/^Payments\./, ""),
      "VNPAY",
      "VNPay"
    ],
    [PaymentType.VIETQR]: [
      PaymentType.VIETQR,
      PaymentType.VIETQR.replace(/^Payments\./, ""),
      "VIETQR",
      "VietQR"
    ]
  };

  return (Object.entries(paymentTypeAliases) as Array<[PaymentType, string[]]>).find(
    ([, aliases]) => aliases.includes(normalizedValue) || aliases.includes(strippedValue)
  )?.[0];
};

export const formatPaymentMethod = (value?: string | null) => {
  const paymentType = resolvePaymentType(value);
  const normalizedValue = value?.replace(/^Payments\./, "").trim();

  switch (paymentType) {
    case PaymentType.POS:
      return "Tiền mặt";
    case PaymentType.VIETQR:
      return "Quét VietQR";
    case PaymentType.VNPAY:
      return "Quét VNPayQR";
    default:
      return normalizedValue || "--";
  }
};

const extractTimePart = (projectTime?: string) => {
  if (!projectTime) return undefined;

  const parsedTime = dayjs(projectTime);
  if (parsedTime.isValid()) {
    return parsedTime.format("HH:mm:ss");
  }

  const matchedTime = projectTime.match(/\b\d{2}:\d{2}(:\d{2})?\b/);
  return matchedTime
    ? matchedTime[0].length === 5
      ? `${matchedTime[0]}:00`
      : matchedTime[0]
    : undefined;
};

export const getPlanScreeningDateTime = (projectDate?: string, projectTime?: string) => {
  if (!projectTime) return undefined;

  const timePart = extractTimePart(projectTime);
  if (!timePart) {
    const parsedTime = dayjs(projectTime);
    return parsedTime.isValid() ? parsedTime : undefined;
  }

  if (!projectDate) {
    const parsedTime = dayjs(projectTime);
    return parsedTime.isValid() ? parsedTime : dayjs(`${dayjs().format("YYYY-MM-DD")}T${timePart}`);
  }

  return dayjs(`${dayjs(projectDate).format("YYYY-MM-DD")}T${timePart}`);
};

export const isPlanScreeningLocked = (projectDate?: string, projectTime?: string) => {
  const screeningDateTime = getPlanScreeningDateTime(projectDate, projectTime);
  if (!screeningDateTime?.isValid()) return false;

  return !screeningDateTime.add(30, "minute").isAfter(dayjs());
};

export function formatNumber(x: number) {
  return (x || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function filterEmptyValues<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== "" && value !== undefined)
  ) as Partial<T>;
}

export const formatter: InputNumberProps<number>["formatter"] = (value) => {
  const [start, end] = `${value}`.split(".") || [];
  const v = `${start}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${end ? `${v}.${end}` : `${v}`}`;
};

export const sortSeats = (seats: string[]): string[] => {
  return [...seats].sort((a, b) => {
    const matchA = a.match(/^([A-Za-z]+)(\d+)$/);
    const matchB = b.match(/^([A-Za-z]+)(\d+)$/);

    if (!matchA || !matchB) return 0;

    const rowA = matchA[1];
    const rowB = matchB[1];

    const numA = parseInt(matchA[2], 10);
    const numB = parseInt(matchB[2], 10);

    // So sánh row trước
    if (rowA !== rowB) {
      return rowA.localeCompare(rowB);
    }

    // Nếu cùng row → so sánh số
    return numA - numB;
  });
};

const ROOM_ONE_SPECIAL_PRINT_NAME = "1";

const getSpecialPrintSeatOrder = (seat?: string | null) => {
  const matchedSeat = seat?.trim().match(/^([A-Za-z]+)(\d+)$/);

  if (!matchedSeat) {
    return null;
  }

  const [, rowLabel, seatNumberText] = matchedSeat;
  const seatNumber = Number(seatNumberText);

  if (!Number.isFinite(seatNumber)) {
    return null;
  }

  return {
    rowLabel: rowLabel.toUpperCase(),
    parityOrder: seatNumber % 2 === 0 ? 0 : 1,
    seatNumber
  };
};

export const sortSeatsForPrint = (seats: string[], roomName?: string | null): string[] => {
  if ((roomName || "").trim() !== ROOM_ONE_SPECIAL_PRINT_NAME) {
    return sortSeats(seats);
  }

  return [...seats].sort((left, right) => {
    const leftOrder = getSpecialPrintSeatOrder(left);
    const rightOrder = getSpecialPrintSeatOrder(right);

    if (!leftOrder || !rightOrder) {
      return sortSeats([left, right])[0] === left ? -1 : 1;
    }

    if (leftOrder.rowLabel !== rightOrder.rowLabel) {
      return leftOrder.rowLabel.localeCompare(rightOrder.rowLabel, "vi", {
        sensitivity: "base"
      });
    }

    if (leftOrder.parityOrder !== rightOrder.parityOrder) {
      return leftOrder.parityOrder - rightOrder.parityOrder;
    }

    return leftOrder.seatNumber - rightOrder.seatNumber;
  });
};

type SeatValueSource = {
  listChairValueF1?: string | null;
  listChairValueF2?: string | null;
  listChairValueF3?: string | null;
};

type SeatIndexSource = {
  listChairIndexF1?: string | null;
  listChairIndexF2?: string | null;
  listChairIndexF3?: string | null;
};

type SeatSource = SeatValueSource & SeatIndexSource;

const buildSeatCodeByFloorMap = (listSeats?: ListSeat[][] | null) =>
  (listSeats ?? [])
    .flatMap((row) => row)
    .reduce<Record<string, string>>((acc, seat) => {
      acc[`${seat.floor}-${seat.seat}`] = seat.code;
      return acc;
    }, {});

const splitSeatList = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .map((seat) => seat.trim())
    .filter(Boolean);

export const extractSeatValues = (
  items?: SeatSource[] | null,
  listSeats?: ListSeat[][] | null
): string[] => {
  const seatCodeByFloorMap = buildSeatCodeByFloorMap(listSeats);

  return (items ?? []).flatMap((item) => {
    const seatValues = [item.listChairValueF1, item.listChairValueF2, item.listChairValueF3]
      .flatMap((value) => splitSeatList(value))
      .filter(Boolean);

    if (seatValues.length > 0) {
      return seatValues;
    }

    return ([1, 2, 3] as const).flatMap((floor) => {
      const key = `listChairIndexF${floor}` as const;

      return splitSeatList(item[key]).map(
        (seatIndex) => seatCodeByFloorMap[`${floor}-${seatIndex}`] ?? seatIndex
      );
    });
  });
};

export const formatSeatValues = (items?: SeatSource[] | null, listSeats?: ListSeat[][] | null) =>
  extractSeatValues(items, listSeats).join(", ");

export const buildTicketsFromOrder = async (
  data: OrderDetailProps,
  staffName?: string,
  posName?: string
): Promise<PrintTicketPayload[]> => {
  const tickets: PrintTicketPayload[] = [];
  const qrBase64 = await QRCode.toDataURL(data.order.barCode);
  const { cinemaName, address } = useSettingBranchStore.getState();
  const branchCinemaName = cinemaName || DEFAULT_BRANCH_SETTINGS.cinemaName;
  const branchAddress = address || DEFAULT_BRANCH_SETTINGS.address;
  const printedTicketPrice = data.order.isContract ? formatMoney(0) : undefined;
  const discountImage =
    data.order.voucherCode === U22_TICKET_VOUCHER_CODE ? U22_TICKET_IMAGE_URL : undefined;

  const ticketGroups = data.planDetails?.length ? data.planDetails : [data];

  ticketGroups.forEach((detail) => {
    const planScreeningId = detail.planScreening?.id;
    const orderItems =
      planScreeningId != null
        ? data.order.items.filter((item) => item.planScreenId === planScreeningId)
        : data.order.items;

    const planSeats = orderItems.flatMap((item) =>
      extractSeatValues([item], detail.planScreening?.listSeats).map((seat) => ({
        seat,
        item
      }))
    );

    const remainingPlanSeats = [...planSeats];
    const sortedPlanSeats = sortSeatsForPrint(
      planSeats.map(({ seat }) => seat),
      detail.room?.name
    )
      .map((seat) => {
        const matchedIndex = remainingPlanSeats.findIndex((planSeat) => planSeat.seat === seat);

        if (matchedIndex === -1) {
          return null;
        }

        const [matchedPlanSeat] = remainingPlanSeats.splice(matchedIndex, 1);
        return matchedPlanSeat;
      })
      .filter((planSeat): planSeat is (typeof planSeats)[number] => Boolean(planSeat));

    sortedPlanSeats.forEach(({ seat, item }) => {
      tickets.push({
        cinemaName: branchCinemaName,
        address: branchAddress,
        movieName: detail.film.filmName,
        showTime: dayjs(detail.planScreening.projectTime).format("HH:mm"),
        date: dayjs(detail.planScreening.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY"),
        seat,
        room: detail.room.name,
        floor: detail.room.floor,
        price: printedTicketPrice ?? formatMoney(item.unitPriceInclTax),
        ticketCode: data.order.barCode,
        qrData: qrBase64,
        discountImage: discountImage ?? item.discount?.image,
        posName,
        staffName,
        paymentMethod: formatPaymentMethod(data.order.paymentMethodSystemName)
      });
    });
  });

  return tickets;
};
