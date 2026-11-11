// Checkbox "Áp dụng ưu đãi U22" khi thêm ca chiếu (U22 theo từng suất) và hiển thị `u22Policy` của suất.
// Backend luôn áp dụng khi bán (không có flag). Quy tắc (contract V3.2 mục 4, 7):
// - Backend cũ (rules 404): ẩn, không gửi `u22Enabled`.
// - DB chưa có bảng chính sách (`rules.ready = false` hoặc thiếu `schema.screeningPolicy`): hiện nhưng khóa, kèm
//   lỗi tương thích, không gửi `u22Enabled` (backend từ chối U22 hoàn toàn trong thời gian này).
// - Suất 2D hợp lệ: mặc định BẬT; người dùng tự bật/tắt. Suất chiếu sớm KHÔNG tự tắt.
// - Đồng giá, ngày lễ, ngày không áp ưu đãi, phiên bản không phải 2D: TẮT và khóa, kèm lý do.
// - Bỏ Đồng giá: khôi phục lựa chọn trước đó của người dùng (không bật lại nếu người dùng đã tự tắt).
// - Chưa đủ thông tin (đang tải giá/quy tắc, chưa chọn phim): không kết luận được, chặn lưu.
import { getApiErrorCode, getApiErrorDetails } from "@renderer/lib/apiError";
import type {
  HolidayProps,
  PlanPricingProps,
  PlanScreeningU22Policy,
  PricingRules
} from "@shared/types";

export const U22_UNIFORM_PRICE_MESSAGE = "Suất chiếu Đồng giá không áp dụng ưu đãi U22.";
export const U22_NOT_2D_MESSAGE = "Ưu đãi U22 chỉ áp dụng cho suất chiếu 2D.";
export const U22_PROMOTION_EXCLUDED_MESSAGE =
  "Ngày không áp ưu đãi theo chính sách NCC: không áp dụng ưu đãi U22.";
export const U22_SCHEMA_MISSING_MESSAGE =
  "Cơ sở dữ liệu chưa được cập nhật cấu trúc V3.2: chưa lưu được thiết lập U22 theo suất.";

const holidayMessage = (holidayName?: string | null) =>
  holidayName?.trim()
    ? `Ngày lễ (${holidayName.trim()}): không áp dụng ưu đãi U22.`
    : "Ngày lễ: không áp dụng ưu đãi U22.";

export const isU22Version = (versionCode?: string | null) =>
  Boolean(versionCode?.toUpperCase().includes("2D"));

export type U22CheckboxState = {
  /** Hiện checkbox (backend V3.2). */
  visible: boolean;
  /** Gửi `u22Enabled` khi lưu: chỉ khi DB có bảng chính sách. */
  submit: boolean;
  /** Giá trị gửi lên khi lưu. */
  checked: boolean;
  disabled: boolean;
  /** Lý do U22 bị tắt/khóa (hoặc đang chờ thông tin, hoặc lỗi tương thích). */
  reason: string | null;
  /** Chưa đủ thông tin để kết luận U22 được phép hay không: chặn lưu. */
  undetermined: boolean;
};

export type U22CheckboxInput = {
  rules?: PricingRules | null;
  isRulesLoading: boolean;
  /** Giá bảng đã sẵn sàng (không đang tải, không placeholder, không lỗi). */
  isPricingReady: boolean;
  pricing?: PlanPricingProps | null;
  versionCode?: string | null;
  isUniform: boolean;
  /** Lựa chọn tường minh của người dùng; `null` = chưa chạm (mặc định BẬT khi hợp lệ). */
  userChoice: boolean | null;
};

const HIDDEN: U22CheckboxState = {
  visible: false,
  submit: false,
  checked: false,
  disabled: true,
  reason: null,
  undetermined: false
};

/** Trạng thái checkbox U22 của suất đang lập. Hàm thuần để test các trường hợp nghiệp vụ. */
export const getU22CheckboxState = ({
  rules,
  isRulesLoading,
  isPricingReady,
  pricing,
  versionCode,
  isUniform,
  userChoice
}: U22CheckboxInput): U22CheckboxState => {
  // Đang tải quy tắc: chưa biết backend có chính sách U22 theo suất không → chặn lưu tới khi có kết quả.
  // Backend cũ (404) hoặc lỗi: ẩn checkbox, không gửi `u22Enabled`.
  if (!rules) return isRulesLoading ? { ...HIDDEN, undetermined: true } : HIDDEN;
  if (!rules.ready || !rules.schema.screeningPolicy) {
    return { ...HIDDEN, visible: true, reason: U22_SCHEMA_MISSING_MESSAGE };
  }
  const locked = (reason: string): U22CheckboxState => ({
    visible: true,
    submit: true,
    checked: false,
    disabled: true,
    reason,
    undetermined: false
  });
  if (!versionCode) {
    return { ...locked("Chọn phim để xác định ưu đãi U22."), undetermined: true };
  }
  if (!isU22Version(versionCode)) return locked(U22_NOT_2D_MESSAGE);
  if (isUniform) return locked(U22_UNIFORM_PRICE_MESSAGE);
  if (!isPricingReady || !pricing) {
    return {
      ...locked("Đang tải thông tin ngày chiếu để xác định ưu đãi U22…"),
      undetermined: true
    };
  }
  if (pricing.isHoliday) return locked(holidayMessage(pricing.holidayName));
  if (pricing.isPromotionExcluded) return locked(U22_PROMOTION_EXCLUDED_MESSAGE);
  return {
    visible: true,
    submit: true,
    checked: userChoice ?? true,
    disabled: false,
    reason: null,
    undetermined: false
  };
};

const U22_POLICY_INVALID_MESSAGES: Record<string, string> = {
  UNIFORM_PRICE: U22_UNIFORM_PRICE_MESSAGE,
  HOLIDAY: "Ngày chiếu là ngày lễ: không áp dụng ưu đãi U22.",
  PROMOTION_EXCLUDED: U22_PROMOTION_EXCLUDED_MESSAGE,
  UNSUPPORTED_VERSION: U22_NOT_2D_MESSAGE
};

/**
 * Thông báo cho 400 `U22_SCREENING_POLICY_INVALID` (`details.reason`) và 503
 * `U22_SCREENING_POLICY_SCHEMA_MISSING` (không lưu gì), hoặc `null` nếu lỗi khác.
 */
export const getU22PolicyInvalidMessage = (error: unknown): string | null => {
  const code = getApiErrorCode(error);
  if (code === "U22_SCREENING_POLICY_SCHEMA_MISSING") {
    return `${U22_SCHEMA_MISSING_MESSAGE} Chưa lưu thay đổi.`;
  }
  if (code !== "U22_SCREENING_POLICY_INVALID") return null;
  const details = getApiErrorDetails(error) as { reason?: unknown } | undefined;
  const reason = typeof details?.reason === "string" ? details.reason : "";
  const base =
    U22_POLICY_INVALID_MESSAGES[reason] ?? "Suất chiếu này không được áp dụng ưu đãi U22.";
  return `${base} Đã tải lại thông tin, vui lòng kiểm tra lựa chọn ưu đãi U22.`;
};

/**
 * Trạng thái cột "Ưu đãi U22" của một suất trong danh sách Giờ chiếu:
 * - `success` "Có thể áp dụng": được xét U22 (còn tùy khách hàng); thao tác nhỏ "Tắt".
 * - `warning` "Không áp dụng": quản lý đã tắt U22 cho suất hợp lệ; thao tác nhỏ "Bật lại".
 * - `error` "Không áp dụng": điều kiện bắt buộc (ngày lễ, ngày không áp U22, Đồng giá, phiên bản không phải 2D),
 *   kèm lý do ngắn; KHÔNG có thao tác bật (backend chắc chắn từ chối).
 * - `default` "Chưa xác định": thiếu dữ liệu (chính sách suất, chính sách ngày hoặc phiên bản phim), không thao tác.
 */
export type ScreeningU22Status = {
  label: "Có thể áp dụng" | "Không áp dụng" | "Chưa xác định";
  tone: "success" | "warning" | "error" | "default";
  tooltip: string;
  /** Lý do bắt buộc ngắn, hiện nhỏ màu xám dưới badge. */
  reason: string | null;
  /** Thao tác hợp lệ với trạng thái hiện tại (`null`: không có). */
  action: "enable" | "disable" | null;
};

export type ScreeningU22Context = {
  /** `u22Policy` của suất trong danh sách (chỉ là thiết lập đã lưu, backend không kèm lý do chặn theo ngày). */
  policy?: PlanScreeningU22Policy | null;
  /** Ngày chiếu trong Danh sách ngày; `undefined` khi chưa tải được. */
  day?: Pick<HolidayProps, "isHoliday" | "isPromotionExcluded"> | null;
  /** Phiên bản phim của suất (từ danh sách phim của kế hoạch); `undefined` khi chưa biết. */
  versionCode?: string | null;
};

const U22_STATUS_TOOLTIPS = {
  allowed: "Suất chiếu được phép xét U22 nếu khách hàng đáp ứng các điều kiện.",
  holiday: "Suất chiếu thuộc ngày lễ, không áp dụng ưu đãi U22.",
  promotionExcluded: "Ngày chiếu không áp dụng ưu đãi U22 theo chính sách NCC.",
  uniform: U22_UNIFORM_PRICE_MESSAGE,
  version: U22_NOT_2D_MESSAGE,
  manualOff: "Ưu đãi U22 đã được tắt cho suất chiếu này.",
  unavailable: "Chưa đọc được chính sách U22 của suất chiếu.",
  dayUnknown: "Chưa tải được chính sách của ngày chiếu, chưa xác định được ưu đãi U22.",
  versionUnknown: "Chưa xác định được phiên bản phim của suất, chưa xác định được ưu đãi U22."
} as const;

const unknownStatus = (tooltip: string): ScreeningU22Status => ({
  label: "Chưa xác định",
  tone: "default",
  tooltip,
  reason: null,
  action: null
});

const blockedStatus = (reason: string, tooltip: string): ScreeningU22Status => ({
  label: "Không áp dụng",
  tone: "error",
  tooltip,
  reason,
  action: null
});

/**
 * Trạng thái U22 của một suất, theo đúng thứ tự backend kiểm tra (ngày lễ → ngày không áp U22 → Đồng giá → phiên
 * bản). `u22Enabled = false` chỉ được coi là "tắt thủ công" (có "Bật lại") khi đã biết chắc không có điều kiện bắt
 * buộc nào; thiếu dữ liệu thì trả "Chưa xác định", không bao giờ mặc định "Có thể áp dụng". Suất chiếu sớm 2D không bị
 * chặn. `null` khi backend chưa trả `u22Policy`.
 */
export const getScreeningU22Status = ({
  policy,
  day,
  versionCode
}: ScreeningU22Context): ScreeningU22Status | null => {
  if (!policy) return null;
  if (policy.source === "UNAVAILABLE") return unknownStatus(U22_STATUS_TOOLTIPS.unavailable);
  // Điều kiện bắt buộc đã biết chắc: hiện ngay, không có thao tác bật.
  if (day?.isHoliday === true) return blockedStatus("Ngày lễ", U22_STATUS_TOOLTIPS.holiday);
  if (day?.isPromotionExcluded === true) {
    return blockedStatus("Ngày không áp U22", U22_STATUS_TOOLTIPS.promotionExcluded);
  }
  if (policy.priceMode === "UNIFORM") return blockedStatus("Đồng giá", U22_STATUS_TOOLTIPS.uniform);
  if (versionCode && !isU22Version(versionCode)) {
    return blockedStatus(`Không hỗ trợ ${versionCode.trim().toUpperCase()}`, U22_STATUS_TOOLTIPS.version);
  }
  // Muốn kết luận "được xét" hay "tắt thủ công" thì phải biết đủ chính sách ngày và phiên bản phim.
  if (!day || typeof day.isHoliday !== "boolean" || typeof day.isPromotionExcluded !== "boolean") {
    return unknownStatus(U22_STATUS_TOOLTIPS.dayUnknown);
  }
  if (!versionCode) return unknownStatus(U22_STATUS_TOOLTIPS.versionUnknown);
  // Suất cũ (chưa có thiết lập riêng) giữ quy tắc hiện tại: được xét.
  if (policy.source === "LEGACY_UNSPECIFIED" || policy.u22Enabled === true) {
    return {
      label: "Có thể áp dụng",
      tone: "success",
      tooltip: U22_STATUS_TOOLTIPS.allowed,
      reason: null,
      action: "disable"
    };
  }
  if (policy.u22Enabled === false) {
    return {
      label: "Không áp dụng",
      tone: "warning",
      tooltip: U22_STATUS_TOOLTIPS.manualOff,
      reason: null,
      action: "enable"
    };
  }
  return unknownStatus(U22_STATUS_TOOLTIPS.unavailable);
};
