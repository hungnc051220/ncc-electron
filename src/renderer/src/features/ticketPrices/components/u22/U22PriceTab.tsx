// Tab "Giá vé U22": một cấu hình cố định 7 giá theo thứ (bảng U22PriceConfig).
import { getApiErrorCode, getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { U22_PRICE_CONFIG_UNAVAILABLE } from "@renderer/api/u22PriceConfig.api";
import type { U22PriceConfig } from "@shared/types";
import { Alert, Button, Card, Skeleton, Tag, theme, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import type { CSSProperties } from "react";
import { Link } from "react-router";
import {
  formatU22Price,
  getGroupPrice,
  pickU22Prices,
  U22_DAY_BY_KEY,
  U22_DAYS,
  U22_GROUPS,
  type U22DraftPrices,
  type U22Group
} from "./u22PriceGroups";

const { Text } = Typography;

const GroupPrice = ({ prices, group }: { prices: U22DraftPrices; group: U22Group }) => {
  const value = getGroupPrice(prices, group);
  if (value !== null) {
    return (
      <div className="text-2xl font-semibold" data-testid={`u22-group-${group.key}`}>
        {formatU22Price(value)}
      </div>
    );
  }
  return (
    <Tooltip
      title={group.days
        .map((day) => `${U22_DAY_BY_KEY[day].short}: ${formatU22Price(prices[day])}`)
        .join(" · ")}
    >
      <Tag color="gold" className="w-fit" data-testid={`u22-group-${group.key}`}>
        Giá riêng từng thứ
      </Tag>
    </Tooltip>
  );
};

type U22PriceTabProps = {
  config?: U22PriceConfig;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
};

const U22PriceTab = ({ config, isLoading, error, onRetry }: U22PriceTabProps) => {
  // Màu theo token antd: đúng cả giao diện sáng và tối (không dùng màu Tailwind cố định).
  const { token } = theme.useToken();
  if (error) {
    const unavailable = getApiErrorCode(error) === U22_PRICE_CONFIG_UNAVAILABLE;
    return (
      <Alert
        type="error"
        showIcon
        title="Không đọc được cấu hình giá vé U22"
        description={
          unavailable
            ? "Máy chủ trả lỗi U22_PRICE_CONFIG_UNAVAILABLE: chưa có bảng hoặc bản ghi cấu hình. Trong lúc này POS không bán được vé U22 (không tự quay về 55.000đ). Liên hệ quản trị viên hệ thống."
            : getSafeApiErrorMessage(error, "Không tải được giá vé U22")
        }
        action={
          <Button size="small" onClick={onRetry}>
            Thử lại
          </Button>
        }
      />
    );
  }

  if (isLoading || !config) return <Skeleton active />;

  const prices = pickU22Prices(config);
  return (
    <div className="flex flex-col gap-3 overflow-auto pb-4">
      <Alert
        type="info"
        showIcon
        title={
          <span>
            Giá U22 áp theo <strong>thứ của ngày suất chiếu</strong>. Ngày được đánh dấu{" "}
            <strong>ngày lễ</strong> trong Danh sách ngày không áp dụng U22.{" "}
            {/* Rule toàn cục `a { color: inherit !important }` thắng style inline: dùng class app-link (ISS-12). */}
            <Link
              to="/holidays"
              className="app-link"
              style={{ "--app-link-color": token.colorLink } as CSSProperties}
            >
              Mở Danh sách ngày
            </Link>
          </span>
        }
      />
      <Card size="small">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">Giá vé U22 hiện hành</span>
          <Text type="secondary" data-testid="u22-last-update">
            Cập nhật lần cuối: {config.updatedUser} ·{" "}
            {dayjs(config.updatedOnUtc).format("DD/MM/YYYY HH:mm")}
          </Text>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          {U22_GROUPS.map((group) => (
            <div
              key={group.key}
              className="flex flex-col gap-1 rounded-md p-3"
              style={{ background: token.colorFillAlter, color: token.colorText }}
            >
              <Text type="secondary">{group.label}</Text>
              <GroupPrice prices={prices} group={group} />
            </div>
          ))}
        </div>
        <div className="mb-3 grid grid-cols-7 gap-2">
          {U22_DAYS.map((day) => (
            <div
              key={day.key}
              className="flex flex-col items-center rounded-md border p-2"
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <span>{day.label}</span>
              <strong data-testid={`u22-day-${day.key}`}>{formatU22Price(prices[day.key])}</strong>
            </div>
          ))}
        </div>
        <Text type="secondary">
          Giá mới áp dụng cho các đơn bán sau khi lưu. Vé đã bán không tính lại.
        </Text>
      </Card>
    </div>
  );
};

export default U22PriceTab;
