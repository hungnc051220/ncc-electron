import { Bar, type BarConfig } from "@ant-design/charts";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { useThemeStore } from "@renderer/store/theme.store";
import { theme as antdTheme } from "antd";
import { useEffect, useRef, useState } from "react";
import { QuarterlyReportFilterValues } from "../../types";
import { formatQuarterLabel } from "../../utils";
import { TimeTreeRow } from ".";

interface RoomRevenueChartProps {
  currentData: TimeTreeRow[];
  compareData: TimeTreeRow[];
  filterValues: QuarterlyReportFilterValues;
}

type PeriodKey = "compare" | "current";

const formatCompactMoney = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${formatNumber(Number((value / 1_000_000_000).toFixed(1)))} tỷ`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${formatNumber(Number((value / 1_000_000).toFixed(1)))} tr`;
  }

  return formatMoney(value);
};

const sumRoomTotals = (row?: TimeTreeRow) => ({
  tickets: row?.totalTickets || 0,
  revenue: row?.totalRevenue || 0
});

const RoomRevenueChart = ({ currentData, compareData, filterValues }: RoomRevenueChartProps) => {
  const hasCompareDate = !!filterValues.compareDate;
  const isDark = useThemeStore((state) => state.theme === "dark");
  const { token } = antdTheme.useToken();
  const [hiddenPeriods, setHiddenPeriods] = useState<PeriodKey[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(360);

  const togglePeriod = (period: PeriodKey) => {
    setHiddenPeriods((current) => {
      if (current.includes(period)) {
        return current.filter((item) => item !== period);
      }

      if (current.length >= 1) {
        return current;
      }

      return [...current, period];
    });
  };

  useEffect(() => {
    const container = chartContainerRef.current;

    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setChartHeight(Math.max(1, Math.floor(entry.contentRect.height)));
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  if (!filterValues.fromDate || (!currentData.length && !compareData.length)) {
    return null;
  }

  const currentLabel = formatQuarterLabel(filterValues.fromDate);
  const compareLabel = filterValues.compareDate ? formatQuarterLabel(filterValues.compareDate) : "";
  const roomLabels = Array.from(
    new Set([...currentData.map((item) => item.label), ...compareData.map((item) => item.label)])
  );

  const chartData = roomLabels.map((label) => {
    const currentTotals = sumRoomTotals(currentData.find((item) => item.label === label));
    const compareTotals = hasCompareDate
      ? sumRoomTotals(compareData.find((item) => item.label === label))
      : { tickets: 0, revenue: 0 };
    const revenueDiff = currentTotals.revenue - compareTotals.revenue;
    const revenuePercent = compareTotals.revenue
      ? (revenueDiff / compareTotals.revenue) * 100
      : undefined;

    return {
      room: label,
      currentRevenue: currentTotals.revenue,
      compareRevenue: compareTotals.revenue,
      currentTickets: currentTotals.tickets,
      compareTickets: compareTotals.tickets,
      revenueDiff,
      revenuePercent
    };
  });

  const totalCurrent = chartData.reduce((sum, item) => sum + item.currentRevenue, 0);
  const totalCompare = chartData.reduce((sum, item) => sum + item.compareRevenue, 0);
  const totalDiff = totalCurrent - totalCompare;

  const chartSource = chartData
    .flatMap((item) =>
      hasCompareDate
        ? [
            {
              room: item.room,
              periodKey: "compare",
              period: compareLabel,
              value: item.compareRevenue
            },
            {
              room: item.room,
              periodKey: "current",
              period: currentLabel,
              value: item.currentRevenue
            }
          ]
        : [
            {
              room: item.room,
              periodKey: "current",
              period: currentLabel,
              value: item.currentRevenue
            }
          ]
    )
    .filter((item) => !hiddenPeriods.includes(item.periodKey as PeriodKey));

  const chartConfig: BarConfig = {
    data: chartSource,
    xField: "room",
    yField: "value",
    colorField: "period",
    group: hasCompareDate,
    height: chartHeight,
    autoFit: true,
    color: hasCompareDate ? ["#94a3b8", "#f97316"] : ["#f97316"],
    theme: {
      type: isDark ? "dark" : "light",
      view: {
        viewFill: "transparent"
      }
    },
    axis: {
      x: {
        title: false,
        labelFill: token.colorTextSecondary,
        labelFormatter: (value: number) => formatCompactMoney(value)
      },
      y: {
        title: false,
        labelAutoHide: true,
        labelAutoRotate: false,
        labelFill: token.colorTextSecondary,
        line: true,
        lineStroke: token.colorBorderSecondary,
        tickStroke: token.colorBorderSecondary
      }
    },
    legend: false,
    tooltip: {
      title: (datum: { room: string }) => datum.room,
      items: [
        {
          field: "value",
          name: "Doanh thu",
          valueFormatter: (value: number) => formatMoney(value)
        }
      ]
    },
    label: {
      text: (datum: { value: number }) => (datum.value ? formatCompactMoney(datum.value) : ""),
      position: "right",
      style: {
        fontSize: 11,
        fontWeight: 600,
        fill: token.colorText
      }
    },
    style: {
      radiusTopRight: 4,
      radiusBottomRight: 4,
      maxWidth: hasCompareDate ? 18 : 28
    },
    padding: [24, 88, 36, 72]
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm dark:border-white/10 dark:bg-app-bg-container dark:text-slate-100 dark:shadow-none">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            {hasCompareDate ? "So sánh doanh thu theo phòng chiếu" : "Doanh thu theo phòng chiếu"}
          </div>
          <div className="text-xs text-muted-foreground">
            {hasCompareDate ? `${currentLabel} và ${compareLabel}` : currentLabel}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-4 text-right">
          <div>
            <div className="text-xs text-muted-foreground">{currentLabel}</div>
            <div className="text-base font-semibold">{formatCompactMoney(totalCurrent)}</div>
          </div>
          {hasCompareDate && (
            <>
              <div>
                <div className="text-xs text-muted-foreground">{compareLabel}</div>
                <div className="text-base font-semibold">{formatCompactMoney(totalCompare)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Chênh lệch</div>
                <div
                  className={`text-base font-semibold ${
                    totalDiff > 0
                      ? "text-green-600 dark:text-green-400"
                      : totalDiff < 0
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {totalDiff > 0 ? "+" : ""}
                  {formatCompactMoney(totalDiff)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-slate-100 bg-slate-50/40 px-2 pb-1 pt-2 dark:border-white/8 dark:bg-black/10 [&_.g2-tooltip]:text-slate-900"
      >
        <Bar {...chartConfig} />
      </div>

      {hasCompareDate && (
        <div className="mt-2 flex shrink-0 items-center justify-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-white/10 ${
              hiddenPeriods.includes("compare") ? "opacity-45" : ""
            }`}
            onClick={() => togglePeriod("compare")}
          >
            <span className="size-2 rounded-sm bg-slate-400" />
            {compareLabel}
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-white/10 ${
              hiddenPeriods.includes("current") ? "opacity-45" : ""
            }`}
            onClick={() => togglePeriod("current")}
          >
            <span className="size-2 rounded-sm bg-[#f97316]" />
            {currentLabel}
          </button>
        </div>
      )}

      {hasCompareDate && chartData.some((item) => item.revenuePercent !== undefined) && (
        <div className="mt-1 shrink-0 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-muted-foreground dark:border-white/8 dark:bg-white/4">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {chartData
              .filter((item) => item.revenuePercent !== undefined)
              .map((item) => (
                <span key={item.room}>
                  {item.room}:{" "}
                  <span
                    className={
                      item.revenueDiff > 0
                        ? "text-green-600 dark:text-green-400"
                        : item.revenueDiff < 0
                          ? "text-red-600"
                          : ""
                    }
                  >
                    {item.revenueDiff > 0 ? "+" : ""}
                    {formatCompactMoney(item.revenueDiff)} ({item.revenuePercent! > 0 ? "+" : ""}
                    {item.revenuePercent!.toFixed(1)}%)
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default RoomRevenueChart;
