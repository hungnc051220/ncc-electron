import { getApiBaseUrl } from "@/lib/env";
import { cookies } from "next/headers";

const BASE_URL = getApiBaseUrl();

type CancelOrderBodyProps = {
  planScreenId: number;
  orderIds: number[];
  cancelReasonId: number;
  notes?: string;
  isRefund?: boolean;
};

export const cancelOrderService = async (data: CancelOrderBodyProps) => {
  const url = new URL(`/api/pos/order/cancel`, BASE_URL);
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...data }),
  });
};
