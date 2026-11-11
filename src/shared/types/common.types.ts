import { QrDialogData } from "./order.types";

export interface MachineSerialProps {
  shortName: string;
  activeYear: number;
  posName: string;
  printTimes: number;
  cancelTimes: number;
  updatedOnUtc: string;
}

export interface CancellationReasonProps {
  id: number;
  reason: string;
  deleted: boolean;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
}

export interface HolidayProps {
  dateValue: string;
  dateTypeId: number;
  createdOnUtc: string;
  createdUser: string;
  CreatedOnUtc: string;
  /** Ngày lễ: không áp dụng U22. Backend cũ (chưa có cột) không trả trường này. */
  isHoliday?: boolean;
  holidayName?: string | null;
  /**
   * Ngày không áp ưu đãi: giữ giá theo phân loại gốc, backend tự chặn các ưu đãi trong
   * `rules.enforcedPolicies` (hiện chỉ U22). `null`: backend không đọc được cờ; không có: backend cũ.
   */
  isPromotionExcluded?: boolean | null;
  /**
   * Chế độ giá của ngày lễ (V3.2, cột `ApplyHolidayPrice`): `true` "Giá ngày lễ", `false` "Theo ngày trong tuần"
   * (nhóm của `DateTypeId`). Không có tác dụng khi không phải ngày lễ. `null`: backend không đọc được (không đoán).
   */
  applyHolidayPrice?: boolean | null;
  /** Response đánh dấu/sửa ngày lễ (V3.2): số suất chưa xóa của ngày, để nhắc giá đã lưu không tự đổi. */
  existingScreenings?: number;
  /** Response đổi chế độ giá (V3.2): lời nhắc của backend. */
  notice?: string;
}

export interface BackgroundProps {
  id: string;
  name: string;
  urlImage: string;
}

export type AppTheme = "light" | "dark";

export interface QrState {
  isOpen: boolean;
  data?: QrDialogData;
}
