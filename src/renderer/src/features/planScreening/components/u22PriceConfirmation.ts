import {
  U22_PRICE_CHANGED,
  U22_PRICE_CONFIRMATION_REQUIRED
} from "@renderer/api/u22PriceConfig.api";
import { getApiErrorCode, getApiErrorDetails, getApiErrorMessage } from "@renderer/lib/apiError";
import { formatMoney } from "@renderer/lib/utils";

const U22_PRICE_ERROR_CODES = new Set([U22_PRICE_CHANGED, U22_PRICE_CONFIRMATION_REQUIRED]);

/** Lỗi xác nhận giá U22 (400/409): backend không tạo đơn, không ghi gì. */
export const isU22PriceError = (error: unknown) =>
  U22_PRICE_ERROR_CODES.has(getApiErrorCode(error) ?? "");

/** Thông báo cho thu ngân; 409 kèm giá U22 mới và yêu cầu mở lại thẻ VIP để xác nhận. */
export const getU22PriceErrorMessage = (error: unknown) => {
  if (getApiErrorCode(error) === U22_PRICE_CHANGED) {
    const details = getApiErrorDetails(error) as { u22Price?: unknown } | undefined;
    const price = typeof details?.u22Price === "number" ? formatMoney(details.u22Price) : "giá mới";
    return `Giá U22 vừa đổi thành ${price}. Chưa tạo đơn. Vui lòng mở lại "Quẹt thẻ VIP" để xác nhận giá mới.`;
  }
  return getApiErrorMessage(error, "Phiên bản POS chưa hỗ trợ giá U22 mới. Vui lòng cập nhật POS.");
};
