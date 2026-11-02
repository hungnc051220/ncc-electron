import { cn, formatMoney, formatNumber } from "@renderer/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Hourglass, Layers, Ticket, TicketCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { PaperVoucherAmountSummary } from "../paperVoucher.utils";

interface PaperVoucherStatsProps {
  summary: PaperVoucherAmountSummary;
  activeBatchCount: number;
}

type StatTone = "indigo" | "blue" | "emerald" | "amber";

/** Màu nhận diện từng chỉ số, có biến thể riêng cho dark theme. */
const STAT_TONES: Record<StatTone, { icon: string; accent: string }> = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/20",
    accent: "text-indigo-600 dark:text-indigo-300"
  },
  blue: {
    icon: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/20",
    accent: "text-blue-600 dark:text-blue-300"
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20",
    accent: "text-emerald-600 dark:text-emerald-300"
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20",
    accent: "text-amber-600 dark:text-amber-300"
  }
};

interface StatCardProps {
  testId: string;
  label: string;
  value: number;
  hint: ReactNode;
  icon: LucideIcon;
  tone: StatTone;
}

/*
 * Card gọn cho màn POS 1366x768 để danh sách còn nhiều chỗ; từ màn 2xl (>= 1536px) icon và chữ
 * lớn hơn. Con số không bao giờ bị cắt, chỉ nhãn/dòng phụ rút gọn khi cửa sổ quá hẹp.
 */
const StatCard = ({ testId, label, value, hint, icon: Icon, tone }: StatCardProps) => (
  <div
    data-testid={testId}
    className="flex min-w-0 items-center gap-3 rounded-xl border border-app-border bg-app-bg-container px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] 2xl:gap-4 2xl:px-4 2xl:py-3 dark:shadow-none"
  >
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset 2xl:size-12 2xl:rounded-xl",
        STAT_TONES[tone].icon
      )}
    >
      <Icon strokeWidth={2} className="size-4.5 2xl:size-6" />
    </span>
    <div className="min-w-0 flex-1">
      <div
        title={label}
        className="truncate text-xs leading-4 font-medium text-slate-500 2xl:text-sm 2xl:leading-5 dark:text-slate-400"
      >
        {label}
      </div>
      <div className="text-lg leading-6 font-bold tracking-tight whitespace-nowrap text-slate-900 tabular-nums 2xl:text-2xl 2xl:leading-8 dark:text-slate-50">
        {formatNumber(value)}
      </div>
      <div className="truncate text-xs leading-4 text-slate-500 2xl:leading-5 dark:text-slate-400">
        {hint}
      </div>
    </div>
  </div>
);

const PaperVoucherStats = ({ summary, activeBatchCount }: PaperVoucherStatsProps) => {
  const usedPercent = summary.totalQuantity
    ? Math.round((summary.usedCount / summary.totalQuantity) * 100)
    : 0;
  const remainingPercent = summary.totalQuantity ? 100 - usedPercent : 0;

  const highlight = (tone: StatTone, content: ReactNode) => (
    <span className={cn("font-semibold tabular-nums", STAT_TONES[tone].accent)}>{content}</span>
  );

  return (
    <div className="grid shrink-0 grid-cols-4 gap-2 2xl:gap-3">
      <StatCard
        testId="paper-voucher-stat-batches"
        label="Tổng số lô"
        value={summary.totalBatches}
        hint={<>{highlight("indigo", formatNumber(activeBatchCount))} lô đang áp dụng</>}
        icon={Layers}
        tone="indigo"
      />
      <StatCard
        testId="paper-voucher-stat-issued"
        label="Voucher đã phát hành"
        value={summary.totalQuantity}
        hint={`Trị giá ${formatMoney(summary.totalFaceValue)}`}
        icon={Ticket}
        tone="blue"
      />
      <StatCard
        testId="paper-voucher-stat-used"
        label="Voucher đã sử dụng"
        value={summary.usedCount}
        hint={
          <>
            {highlight("emerald", `${usedPercent}%`)} · Trị giá {formatMoney(summary.usedFaceValue)}
          </>
        }
        icon={TicketCheck}
        tone="emerald"
      />
      <StatCard
        testId="paper-voucher-stat-remaining"
        label="Chưa ghi nhận sử dụng"
        value={summary.remainingQuantity}
        hint={
          <>
            {highlight("amber", `${remainingPercent}%`)} · Trị giá{" "}
            {formatMoney(summary.remainingFaceValue)}
          </>
        }
        icon={Hourglass}
        tone="amber"
      />
    </div>
  );
};

export default PaperVoucherStats;
