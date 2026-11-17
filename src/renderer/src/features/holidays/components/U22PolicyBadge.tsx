// Badge "Ưu đãi U22" theo ngày trên Danh sách ngày: "Có thể áp dụng" (xanh), "Không áp dụng" (đỏ) hoặc "Chưa xác
// định" (trung tính), cùng kích thước; diễn giải nằm trong tooltip.
import type { HolidayProps } from "@shared/types";
import { Tag, Tooltip } from "antd";
import { getDayU22Policy } from "../datePolicy";

type U22PolicyBadgeProps = {
  day: Pick<HolidayProps, "dateTypeId" | "isHoliday" | "applyHolidayPrice" | "isPromotionExcluded">;
};

const U22PolicyBadge = ({ day }: U22PolicyBadgeProps) => {
  const policy = getDayU22Policy(day);
  const color = policy.blocked === null ? undefined : policy.blocked ? "error" : "success";
  return (
    <Tooltip title={policy.reason}>
      <Tag color={color} variant="filled" className="m-0 px-2 text-xs leading-5">
        {policy.label}
      </Tag>
    </Tooltip>
  );
};

export default U22PolicyBadge;
