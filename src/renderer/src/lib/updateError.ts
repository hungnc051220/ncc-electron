import type { UpdateErrorCode, UpdateErrorPayload, UpdateErrorStage } from "@shared/types";

export interface UpdateErrorContent {
  severity: "warning" | "error";
  title: string;
  description: string;
}

const UPDATE_ERROR_CODES: UpdateErrorCode[] = [
  "UPDATE_NETWORK",
  "UPDATE_METADATA_UNAVAILABLE",
  "UPDATE_DOWNLOAD_FAILED",
  "UPDATE_INSTALL_FAILED",
  "UPDATE_MANUAL_INSTALL_REQUIRED",
  "UPDATE_UNKNOWN"
];
const UPDATE_ERROR_STAGES: UpdateErrorStage[] = ["check", "download", "install"];

const STAGE_TITLES: Record<UpdateErrorStage, string> = {
  check: "Không thể kiểm tra cập nhật",
  download: "Tải bản cập nhật thất bại",
  install: "Không thể cài đặt bản cập nhật"
};

const CONTACT_SUPPORT = "Vui lòng liên hệ bộ phận kỹ thuật.";

/**
 * Chuẩn hóa payload `update:error`; payload lạ (vd. chuỗi lỗi thô từ phiên bản cũ) được coi là lỗi
 * không xác định để không bao giờ hiển thị nguyên văn lên UI.
 */
export function normalizeUpdateErrorPayload(value: unknown): UpdateErrorPayload {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<UpdateErrorPayload>;
  const code = UPDATE_ERROR_CODES.includes(raw.code as UpdateErrorCode)
    ? (raw.code as UpdateErrorCode)
    : "UPDATE_UNKNOWN";
  const stage = UPDATE_ERROR_STAGES.includes(raw.stage as UpdateErrorStage)
    ? (raw.stage as UpdateErrorStage)
    : "check";
  const retryable = typeof raw.retryable === "boolean" ? raw.retryable : stage !== "install";

  return { code, stage, retryable };
}

const getDescription = ({ code, stage }: UpdateErrorPayload): string => {
  switch (code) {
    case "UPDATE_NETWORK":
      return stage === "download"
        ? "Tải bản cập nhật thất bại. Vui lòng kiểm tra Internet và thử lại sau."
        : "Không thể kiểm tra bản cập nhật. Vui lòng kiểm tra Internet và thử lại.";
    case "UPDATE_METADATA_UNAVAILABLE":
      return "Máy chủ cập nhật tạm thời không phản hồi. Vui lòng thử lại sau.";
    case "UPDATE_DOWNLOAD_FAILED":
      return "Tải bản cập nhật thất bại. Vui lòng thử lại sau.";
    case "UPDATE_INSTALL_FAILED":
      return `Không thể cài đặt bản cập nhật. ${CONTACT_SUPPORT}`;
    case "UPDATE_MANUAL_INSTALL_REQUIRED":
      return `Máy này cần cài bản mới thủ công. ${CONTACT_SUPPORT}`;
    default:
      return "Cập nhật ứng dụng không thành công. Vui lòng thử lại.";
  }
};

/** Thông báo ngắn, thân thiện cho thu ngân; chi tiết kỹ thuật chỉ có trong log của main process. */
export function getUpdateErrorContent(payload: UpdateErrorPayload): UpdateErrorContent {
  return {
    severity: payload.code === "UPDATE_NETWORK" ? "warning" : "error",
    title:
      payload.code === "UPDATE_UNKNOWN" ? "Cập nhật không thành công" : STAGE_TITLES[payload.stage],
    description: getDescription(payload)
  };
}
