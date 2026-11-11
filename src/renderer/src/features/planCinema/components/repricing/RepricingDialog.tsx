// "Đối chiếu giá suất chiếu" (contract V3.2 mục 6, chỉ đọc): so sánh giá đang lưu của từng suất với giá theo cấu
// hình hiện tại, theo từng loại ghế. Hai chế độ:
// - Một ngày (mở từ Danh sách ngày, prop `date`): đúng ngày đó, chỉ suất từ hôm nay; không chọn khoảng ngày.
// - Khoảng ngày (tab Giờ chiếu, prop `initialDate`): chọn khoảng ngày, có thể tra cứu cả suất đã qua.
// Không có nút áp dụng giá: chức năng điều chỉnh giá suất đang tạm ngừng.
import { PRICING_SCHEMA_NOT_READY_MESSAGE } from "@renderer/api/pricingRules.api";
import { useRepricingPreview } from "@renderer/hooks/planScreenings/useRepricing";
import { usePricingRules } from "@renderer/hooks/ticketPrices/usePricingRules";
import { getSafeApiErrorMessage } from "@renderer/lib/apiError";
import { formatNumber } from "@renderer/lib/utils";
import type { RepricingPreviewItem } from "@shared/types";
import type { TableProps } from "antd";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Modal,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  filterRepricingItems,
  formatSeatPrice,
  formatSeatPriceDiff,
  formatWeekdayLabel,
  getRepricingComparison,
  getSeatPriceDiffs,
  isCustomPriceSource,
  parseSeatPrices,
  PRICE_SOURCE_LABELS,
  type SeatPrice,
  summarizeRepricing
} from "./repricing";

const { Text } = Typography;

/** Khoảng đối chiếu tối đa (backend giới hạn 62 ngày). */
export const MAX_PREVIEW_DAYS = 62;

/** Vùng bảng cuộn dọc theo màn hình; ít dữ liệu thì bảng co theo nội dung. */
const TABLE_SCROLL_Y = "max(160px, calc(60vh - 220px))";

const COMPARISON_COLORS = {
  past: undefined,
  unavailable: "error",
  same: "success",
  differs: "warning"
} as const;

type RepricingDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Chế độ một ngày (Danh sách ngày): đối chiếu đúng ngày này, chỉ suất từ hôm nay. */
  date?: Dayjs | null;
  /** Chế độ khoảng ngày (tab Giờ chiếu): ngày mặc định của khoảng. */
  initialDate?: Dayjs | null;
};

const SeatPriceLines = ({
  prices,
  highlightCodes = []
}: {
  prices: SeatPrice[];
  highlightCodes?: string[];
}) =>
  prices.length > 0 ? (
    <div className="flex flex-col">
      {prices.map((price) => (
        <span
          key={price.code}
          className={
            highlightCodes.includes(price.code) ? "font-semibold text-(--ant-color-warning)" : ""
          }
        >
          {formatSeatPrice(price)}
        </span>
      ))}
    </div>
  ) : (
    <Text type="secondary">—</Text>
  );

const SummaryTile = ({
  label,
  value,
  className
}: {
  label: string;
  value: number | null;
  className?: string;
}) => (
  <div className="flex min-w-0 flex-1 flex-col rounded-md border border-(--ant-color-border-secondary) px-3 py-2">
    <Text type="secondary" className="text-xs">
      {label}
    </Text>
    <span className={`text-lg leading-7 font-semibold ${className ?? ""}`}>
      {value === null ? "—" : formatNumber(value)}
    </span>
  </div>
);

const RepricingDialog = ({ open, onClose, date, initialDate }: RepricingDialogProps) => {
  const isSingleDay = Boolean(date);
  const { data: rules, isFetching: isFetchingRules } = usePricingRules();
  const startDate = date ?? initialDate ?? dayjs();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([startDate, startDate]);
  const [showAll, setShowAll] = useState(false);
  const [includePast, setIncludePast] = useState(false);

  const fromDate = (isSingleDay ? startDate : range[0]).format("YYYY-MM-DD");
  const toDate = (isSingleDay ? startDate : range[1]).format("YYYY-MM-DD");
  const rangeDays = dayjs(toDate).diff(dayjs(fromDate), "day") + 1;
  const isRangeValid = rangeDays >= 1 && rangeDays <= MAX_PREVIEW_DAYS;
  const isSupported = Boolean(rules);
  const query = useMemo(
    () =>
      open && isSupported && isRangeValid
        ? { fromDate, toDate, includePast: isSingleDay ? false : includePast }
        : null,
    [fromDate, includePast, isRangeValid, isSingleDay, isSupported, open, toDate]
  );
  const preview = useRepricingPreview(query);
  const items = useMemo(() => preview.data?.items ?? [], [preview.data?.items]);
  const summary = preview.data ? (preview.data.summary ?? summarizeRepricing(items)) : null;
  const visibleItems = useMemo(() => filterRepricingItems(items, showAll), [items, showAll]);

  const columns: TableProps<RepricingPreviewItem>["columns"] = [
    {
      title: "Suất / Giờ chiếu",
      key: "screening",
      width: 120,
      render: (_, item) => (
        <div className="flex flex-col">
          <span>
            {item.projectTime}
            {!isSingleDay && ` · ${dayjs(item.projectDate).format("DD/MM")}`}
          </span>
          <Text type="secondary" className="text-xs">
            #{item.planScreenId}
          </Text>
        </div>
      )
    },
    {
      title: "Phim",
      key: "film",
      ellipsis: { showTitle: false },
      render: (_, item) => {
        const filmName = item.filmName ?? `#${item.filmId}`;
        return (
          <div className="flex min-w-0 flex-col">
            <Tooltip title={filmName} placement="topLeft">
              <span className="truncate">{filmName}</span>
            </Tooltip>
            {item.versionCode && (
              <Text type="secondary" className="text-xs">
                {item.versionCode}
              </Text>
            )}
          </div>
        );
      }
    },
    {
      title: "Phòng",
      key: "room",
      width: 80,
      render: (_, item) => item.roomName ?? `#${item.roomId}`
    },
    {
      title: "Giá đang lưu",
      key: "stored",
      width: 140,
      render: (_, item) => <SeatPriceLines prices={parseSeatPrices(item.stored)} />
    },
    {
      title: "Giá theo cấu hình hiện tại",
      key: "configured",
      width: 170,
      render: (_, item) => {
        if (item.isPast) return <Text type="secondary">Chỉ tra cứu</Text>;
        if (!item.configured) return <Text type="secondary">—</Text>;
        const changedCodes = getSeatPriceDiffs(item.stored, item.configured).map(
          (diff) => diff.code
        );
        return (
          <SeatPriceLines prices={parseSeatPrices(item.configured)} highlightCodes={changedCodes} />
        );
      }
    },
    {
      title: "Chênh lệch / Trạng thái",
      key: "status",
      width: 220,
      render: (_, item) => {
        const comparison = getRepricingComparison(item);
        const showSource = !item.isPast && isCustomPriceSource(item.priceSource);
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Tag color={COMPARISON_COLORS[comparison.kind]} variant="filled" className="m-0">
              {comparison.label}
            </Tag>
            {comparison.kind === "differs" &&
              getSeatPriceDiffs(item.stored, item.configured).map((diff) => (
                <span key={diff.code} className="text-xs">
                  {formatSeatPriceDiff(diff)}
                </span>
              ))}
            {comparison.kind === "unavailable" && (
              <Text type="danger" className="text-xs">
                {item.configuredError?.message ?? "Không tính được giá theo cấu hình hiện tại."}
              </Text>
            )}
            {showSource && (
              <Text type="secondary" className="text-xs">
                Nguồn giá: {PRICE_SOURCE_LABELS[item.priceSource] ?? item.priceSource} (do người
                lập chọn)
              </Text>
            )}
          </div>
        );
      }
    }
  ];

  const getEmptyText = () => {
    if (!summary || summary.total === 0) {
      return isSingleDay
        ? "Ngày này chưa có suất chiếu."
        : "Không có suất chiếu trong khoảng ngày này.";
    }
    if (summary.matching === 0 && summary.past > 0) {
      return "Các suất chiếu đã bắt đầu; giá chỉ để tra cứu.";
    }
    return "Tất cả suất chiếu đều khớp với cấu hình giá hiện tại.";
  };

  const renderResult = () => {
    if (!rules && !isFetchingRules) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Máy chủ chưa hỗ trợ đối chiếu giá suất chiếu."
        />
      );
    }
    if (preview.isError) {
      return (
        <Alert
          type="error"
          showIcon
          title="Không tải được kết quả đối chiếu giá"
          description={getSafeApiErrorMessage(preview.error, "Vui lòng thử lại")}
          action={
            <Button size="small" onClick={() => preview.refetch()}>
              Thử lại
            </Button>
          }
        />
      );
    }
    if (preview.data && visibleItems.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={getEmptyText()} />;
    }
    return (
      <Table<RepricingPreviewItem>
        rowKey={(item) => item.planScreenId}
        dataSource={visibleItems}
        columns={columns}
        size="small"
        bordered
        pagination={false}
        loading={preview.isFetching || isFetchingRules}
        scroll={{ y: TABLE_SCROLL_Y }}
        locale={{ emptyText: " " }}
      />
    );
  };

  return (
    <Modal
      open={open}
      centered
      width="min(1040px, calc(100vw - 32px))"
      title="Đối chiếu giá suất chiếu"
      onCancel={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
      destroyOnHidden
      styles={{
        body: {
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }
      }}
    >
      <Text type="secondary" className="text-[13px]">
        So sánh giá đã lưu với cấu hình giá hiện tại. Không thay đổi dữ liệu.
      </Text>
      {rules && !rules.ready && (
        <Alert type="error" showIcon title={PRICING_SCHEMA_NOT_READY_MESSAGE} />
      )}
      {isSingleDay ? (
        <span>
          Ngày chiếu:{" "}
          <strong>
            {dayjs(fromDate).format("DD/MM/YYYY")} — {formatWeekdayLabel(fromDate)}
          </strong>
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker.RangePicker
            value={range}
            format="DD/MM/YYYY"
            allowClear={false}
            aria-label="Khoảng ngày chiếu"
            onChange={(value) => {
              if (value?.[0] && value[1]) setRange([value[0], value[1]]);
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <Switch
              size="small"
              checked={includePast}
              onChange={setIncludePast}
              aria-label="Bao gồm suất đã qua (chỉ tra cứu)"
            />
            Bao gồm suất đã qua (chỉ tra cứu)
          </label>
          {!isRangeValid && <Text type="danger">Chọn tối đa {MAX_PREVIEW_DAYS} ngày.</Text>}
        </div>
      )}
      {isSupported && (
        <>
          <div className="flex flex-wrap gap-2" data-testid="repricing-summary">
            <SummaryTile label="Tổng suất chiếu" value={summary?.total ?? null} />
            <SummaryTile
              label="Giá trùng khớp"
              value={summary?.matching ?? null}
              className="text-(--ant-color-success)"
            />
            <SummaryTile
              label="Có chênh lệch"
              value={summary?.differing ?? null}
              className={summary?.differing ? "text-(--ant-color-warning)" : ""}
            />
          </div>
          {summary && (summary.unavailable > 0 || summary.past > 0) && (
            <Text type="secondary" className="text-xs">
              {[
                summary.unavailable > 0 &&
                  `${formatNumber(summary.unavailable)} suất không tính được giá theo cấu hình`,
                summary.past > 0 && `${formatNumber(summary.past)} suất đã bắt đầu (chỉ tra cứu)`
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
          {summary && summary.total > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                size="small"
                checked={showAll}
                onChange={setShowAll}
                aria-label="Xem tất cả suất"
              />
              Xem tất cả suất
            </label>
          )}
        </>
      )}
      <div className="flex min-h-0 flex-col">{renderResult()}</div>
      <Text type="secondary" className="text-xs">
        Giá các suất đã lập không tự thay đổi khi cấu hình giá được cập nhật.
      </Text>
    </Modal>
  );
};

export default RepricingDialog;
