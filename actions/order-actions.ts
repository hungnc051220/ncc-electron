"use server";

import { revalidatePath } from "next/cache";
import { cancelOrderService } from "./order-services";

type ActionStateProps = {
  formData: Record<string, string> | null;
  fieldErrors: Record<string, string[]> | null;
  success: boolean;
  error: string | null;
};

export const cancelOrderAction = async (
  prevState: ActionStateProps,
  formData: FormData
): Promise<ActionStateProps> => {
  const planScreenId = formData.get("planScreenId") as string;
  const orderIds = formData.get("orderIds") as string;
  const cancelReasonId = formData.get("cancelReasonId") as string;
  const notes = formData.get("notes") as string;
  const isRefund = formData.get("isRefund") as string;

  const formatData = {
    planScreenId: Number(planScreenId),
    orderIds: JSON.parse(orderIds),
    cancelReasonId: Number(cancelReasonId),
    notes,
    isRefund: isRefund === "true" ? true : false,
  };

  const res = await cancelOrderService(formatData);
  const data = await res.json();
  console.log(data);

  if (!res.ok) {
    return {
      ...prevState,
      success: false,
      error: "Hủy đơn thất bại",
    };
  }

  revalidatePath("/invitation-tickets");

  return {
    ...prevState,
    success: true,
    error: null,
  };
};
