import { getApiBaseUrl } from "@/lib/env";
import {
  BookingTicketBodyProps,
  CreateQrCodeBodyProps,
  PaymentType,
  QrCodeResponseProps,
} from "@/types";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type ActionStateProps = {
  success: boolean;
  error: string | null;
  data?: QrCodeResponseProps;
  orderId?: number;
  orderTotal?: number;
  orderDiscount?: number;
  orderCreatedAt?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookingTicketBodyProps;

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json<ActionStateProps>(
        {
          success: false,
          error: "Unauthorized - No access token",
        },
        { status: 401 },
      );
    }

    const baseUrl = getApiBaseUrl();

    // Tạo đơn hàng
    const orderResponse = await fetch(new URL("/api/pos/order", baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      return NextResponse.json<ActionStateProps>(
        {
          success: false,
          error: orderData?.message || "Tạo đơn thất bại",
        },
        { status: orderResponse.status },
      );
    }

    const orderId = orderData?.id as number | undefined;

    // Thanh toán POS: không cần tạo QR, chỉ trả về orderId
    if (body.paymentMethodSystemName === PaymentType.POS) {
      return NextResponse.json<ActionStateProps>({
        success: true,
        error: null,
        data: undefined,
        orderId,
        orderTotal: orderData?.orderTotal,
        orderDiscount: orderData?.orderDiscount,
        orderCreatedAt: orderData?.createdOnUtc,
      });
    }

    // Thanh toán online: tạo QR code
    const qrBody: CreateQrCodeBodyProps = {
      orderId: orderId!,
      paymentMethod: body.paymentMethodSystemName,
      shortName: body.posShortName,
    };

    const qrResponse = await fetch(
      new URL("/api/pos/order/create-qr", baseUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(qrBody),
      },
    );

    const qrData = await qrResponse.json();

    if (!qrResponse.ok) {
      return NextResponse.json<ActionStateProps>(
        {
          success: false,
          error: qrData?.message || "Tạo QR code thất bại",
        },
        { status: qrResponse.status },
      );
    }

    return NextResponse.json<ActionStateProps>({
      success: true,
      error: null,
      data: qrData as QrCodeResponseProps,
      orderId,
      orderTotal: orderData?.orderTotal,
      orderDiscount: orderData?.orderDiscount,
      orderCreatedAt: orderData?.createdOnUtc,
    });
  } catch (error) {
    console.error("Booking ticket error:", error);
    return NextResponse.json<ActionStateProps>(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

