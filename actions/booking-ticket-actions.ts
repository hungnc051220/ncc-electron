"use server";

import {
  BookingTicketBodyProps,
  PaymentType,
  QrCodeResponseProps,
} from "@/types";
import { revalidatePath } from "next/cache";
import {
  bookingTicketService,
  createQrCodeService,
} from "./booking-ticket-services";

type ActionStateProps = {
  success: boolean;
  error: string | null;
  data?: QrCodeResponseProps;
  orderTotal?: number;
  orderDiscount?: number;
  orderCreatedAt?: string;
};

export const bookingTicketAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const floorNo = Number(formData.get("floorNo") as string);

  const dataToSend: BookingTicketBodyProps = {
    planScreenId: Number(formData.get("planScreenId") as string),
    floorNo,
    paymentMethodSystemName: formData.get("paymentMethodSystemName") as string,
    posName: formData.get("posName") as string,
    posShortName: formData.get("posShortName") as string,
  };

  if (floorNo === 1) {
    dataToSend.listChairIndexF1 = formData.get("listChairIndexF1") as string;
    dataToSend.listChairValueF1 = formData.get("listChairValueF1") as string;
  } else if (floorNo === 2) {
    dataToSend.listChairIndexF2 = formData.get("listChairIndexF2") as string;
    dataToSend.listChairValueF2 = formData.get("listChairValueF2") as string;
  } else if (floorNo === 3) {
    dataToSend.listChairIndexF3 = formData.get("listChairIndexF3") as string;
    dataToSend.listChairValueF3 = formData.get("listChairValueF3") as string;
  }

  const res = await bookingTicketService(dataToSend);
  const data = await res.json();

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: data.message || "Tạo đơn thất bại",
    };
  }

  revalidatePath(`/plan-screening/${data?.id}`);

  if (dataToSend.paymentMethodSystemName === PaymentType.POS) {
    return {
      ...prevState,
      success: true,
      error: null,
      data: undefined,
    };
  }

  const resQr = await createQrCodeService({
    orderId: data?.id,
    paymentMethod: dataToSend.paymentMethodSystemName,
    shortName: dataToSend.posShortName,
  });

  const dataQr = await resQr.json();

  if (!resQr.ok) {
    return {
      ...prevState,
      success: false,
      error: dataQr.message || "Tạo QR code thất bại",
    };
  }

  return {
    success: true,
    error: null,
    data: dataQr as QrCodeResponseProps,
    orderTotal: data?.orderTotal,
    orderDiscount: data?.orderDiscount,
    orderCreatedAt: data?.createdOnUtc,
  };
};
