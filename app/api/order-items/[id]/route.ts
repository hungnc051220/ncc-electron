import { getOrderDetail } from "@/data/loaders";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);

    if (!orderId || isNaN(orderId)) {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }

    const orderDetail = await getOrderDetail(orderId);

    if (!orderDetail) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Chỉ trả về order items để giảm kích thước response
    return NextResponse.json({
      items: orderDetail.order.items,
      barCode: orderDetail.order.barCode,
    });
  } catch (error) {
    console.error("Get order items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

