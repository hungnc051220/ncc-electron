// Ô "Ưu đãi U22" trong danh sách Giờ chiếu: badge trạng thái (cùng kiểu với Danh sách ngày) và một thao tác nhỏ cùng
// hàng khi thật sự hợp lệ ("Bật lại" cho suất bị quản lý tắt, "Tắt" cho suất đang được xét). Lý do bắt buộc (ngày lễ,
// ngày không áp U22, Đồng giá, phiên bản) hiện nhỏ màu xám dưới badge và không có thao tác bật. Đổi U22 qua
// PATCH `{ u22Enabled }`, có xác nhận; không đổi giá, không đụng ưu đãi khác.
import { useUpdatePlanScreening } from "@renderer/hooks/planScreenings/useUpdatePlanScreening";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { getApiErrorCode, getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { isPlanScreeningLocked } from "@renderer/lib/utils";
import type { HolidayProps, PlanScreeningDetailProps } from "@shared/types";
import { Button, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { getScreeningU22Status, getU22PolicyInvalidMessage } from "./u22Screening";

type ScreeningU22PolicyCellProps = {
  screening: PlanScreeningDetailProps;
  canUpdate: boolean;
  /** Ngày chiếu trong Danh sách ngày; `undefined` khi chưa tải được. */
  day?: Pick<HolidayProps, "isHoliday" | "isPromotionExcluded"> | null;
  /** Phiên bản phim của suất; `undefined` khi chưa biết. */
  versionCode?: string | null;
};

const PENDING_TRANSACTIONS_MESSAGE =
  "Suất chiếu đang có giao dịch dở dang (đơn tạm hoặc thanh toán đang chờ), chưa đổi được ưu đãi U22. Vui lòng thử lại sau.";

const TAG_COLORS = { success: "success", warning: "warning", error: "error", default: undefined } as const;

/** Thông báo lỗi khi đổi U22 của suất. */
export const getU22ToggleErrorMessage = (error: unknown) => {
  if (getApiErrorCode(error) === "PLAN_SCREENING_HAS_PENDING_TRANSACTIONS") {
    return PENDING_TRANSACTIONS_MESSAGE;
  }
  return (
    getU22PolicyInvalidMessage(error) ?? getSafeApiErrorMessage(error, "Không đổi được ưu đãi U22")
  );
};

const ScreeningU22PolicyCell = ({
  screening,
  canUpdate,
  day,
  versionCode
}: ScreeningU22PolicyCellProps) => {
  const { message, modal } = useAntdApp();
  const updatePlanScreening = useUpdatePlanScreening();
  const status = getScreeningU22Status({ policy: screening.u22Policy, day, versionCode });
  if (!status) return null;

  const isLocked = isPlanScreeningLocked(screening.projectDate, screening.projectTime);
  const action = canUpdate && !isLocked ? status.action : null;
  const enabling = action === "enable";
  const screeningLabel = `${dayjs(screening.projectDate).format("DD/MM/YYYY")} ${dayjs(screening.projectTime).format("HH:mm")} · ${screening.filmInfo?.filmName ?? `#${screening.filmId}`}`;

  const confirmToggle = () =>
    modal.confirm({
      title: enabling ? "Cho phép xét U22 cho suất này?" : "Tắt ưu đãi U22 cho suất này?",
      content: (
        <div className="flex flex-col gap-1">
          <span>{screeningLabel}</span>
          <span>
            {enabling
              ? "Suất sẽ được xét ưu đãi U22 khi khách hàng đáp ứng các điều kiện."
              : "Các lần bán sau không áp dụng ưu đãi U22. Vé đã bán không thay đổi."}
          </span>
        </div>
      ),
      okText: enabling ? "Cho phép U22" : "Tắt U22",
      cancelText: "Hủy",
      onOk: () =>
        updatePlanScreening
          .mutateAsync({ id: screening.id, dto: { u22Enabled: enabling } })
          .then(() =>
            message.success(enabling ? "Đã cho phép xét U22 cho suất" : "Đã tắt ưu đãi U22 cho suất")
          )
          .catch((error: unknown) => message.error(getU22ToggleErrorMessage(error)))
    });

  return (
    <div className="flex flex-col justify-center gap-0.5">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Tooltip title={status.tooltip}>
          <Tag color={TAG_COLORS[status.tone]} variant="filled" className="m-0 px-2 text-xs leading-5">
            {status.label}
          </Tag>
        </Tooltip>
        {action && (
          <Button
            type="link"
            size="small"
            className="h-auto p-0 text-xs"
            loading={updatePlanScreening.isPending}
            onClick={confirmToggle}
          >
            {enabling ? "Bật lại" : "Tắt"}
          </Button>
        )}
      </div>
      {status.reason && (
        <Typography.Text type="secondary" className="text-xs leading-4">
          {status.reason}
        </Typography.Text>
      )}
    </div>
  );
};

export default ScreeningU22PolicyCell;
