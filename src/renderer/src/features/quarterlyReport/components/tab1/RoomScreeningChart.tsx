import { Column, type ColumnConfig } from "@ant-design/charts";
import { formatNumber } from "@renderer/lib/utils";
import { useThemeStore } from "@renderer/store/theme.store";
import { theme as antdTheme } from "antd";
import { useEffect, useRef, useState } from "react";
import { QuarterlyReportFilterValues } from "../../types";
import { formatQuarterLabel } from "../../utils";
import { TreeRow } from ".";

interface RoomScreeningChartProps {
  data: TreeRow[];
  rooms: string[];
  filterValues: QuarterlyReportFilterValues;
}

type PeriodKey = "compare" | "current";

const getRoomValue = (row: TreeRow, key: string) => Number(row[key] || 0);

const RoomScreeningChart = ({ data, rooms, filterValues }: RoomScreeningChartProps) => {
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

  if (!filterValues.fromDate || rooms.length === 0 || data.length === 0) {
    return null;
  }

  const currentLabel = formatQuarterLabel(filterValues.fromDate);
  const compareLabel = filterValues.compareDate ? formatQuarterLabel(filterValues.compareDate) : "";

  const chartData = rooms.map((room) => {
    const current = data.reduce(
      (sum, row) => sum + getRoomValue(row, hasCompareDate ? `P${room}_current` : `P${room}`),
      0
    );
    const compare = hasCompareDate
      ? data.reduce((sum, row) => sum + getRoomValue(row, `P${room}_compare`), 0)
      : 0;
    const diff = current - compare;
    const percent = compare ? (diff / compare) * 100 : undefined;

    return {
      room,
      current,
      compare,
      diff,
      percent
    };
  });

  const totalCurrent = chartData.reduce((sum, item) => sum + item.current, 0);
  const totalCompare = chartData.reduce((sum, item) => sum + item.compare, 0);
  const totalDiff = totalCurrent - totalCompare;

  const chartSource = chartData
    .flatMap((item) =>
      hasCompareDate
        ? [
            {
              room: `P${item.room}`,
              periodKey: "compare",
              period: compareLabel,
              value: item.compare
            },
            {
              room: `P${item.room}`,
              periodKey: "current",
              period: currentLabel,
              value: item.current
            }
          ]
        : [
            {
              room: `P${item.room}`,
              periodKey: "current",
              period: currentLabel,
              value: item.current
            }
          ]
    )
    .filter((item) => !hiddenPeriods.includes(item.periodKey as PeriodKey));

  const chartConfig: ColumnConfig = {
    data: chartSource,
    xField: "room",
    yField: "value",
    colorField: "period",
    group: hasCompareDate,
    height: chartHeight,
    autoFit: true,
    color: hasCompareDate ? ["#94a3b8", "#1677ff"] : ["#1677ff"],
    theme: {
      type: isDark ? "dark" : "light",
      view: {
        viewFill: "transparent"
      }
    },
    axis: {
      x: {
        title: false,
        labelAutoHide: true,
        labelAutoRotate: false,
        labelFill: token.colorTextSecondary,
        line: true,
        lineStroke: token.colorBorderSecondary,
        tickStroke: token.colorBorderSecondary
      },
      y: {
        title: false,
        grid: true,
        gridLineStroke: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
        labelFill: token.colorTextSecondary,
        labelFormatter: (value: number) => formatNumber(value)
      }
    },
    legend: false,
    tooltip: {
      title: (datum: { room: string }) => datum.room,
      items: [
        {
          field: "value",
          name: "Số buổi chiếu",
          valueFormatter: (value: number) => formatNumber(value)
        }
      ]
    },
    label: {
      text: (datum: { value: number }) => (datum.value ? formatNumber(datum.value) : ""),
      position: "top",
      style: {
        fontSize: 11,
        fontWeight: 600,
        fill: token.colorText
      }
    },
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
      maxWidth: hasCompareDate ? 18 : 28
    },
    padding: [32, 24, 54, 48]
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm dark:border-white/10 dark:bg-app-bg-container dark:text-slate-100 dark:shadow-none">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            {hasCompareDate ? "So sánh số buổi chiếu theo phòng" : "Số buổi chiếu theo phòng"}
          </div>
          <div className="text-xs text-muted-foreground">
            {hasCompareDate ? `${currentLabel} và ${compareLabel}` : currentLabel}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-4 text-right">
          <div>
            <div className="text-xs text-muted-foreground">{currentLabel}</div>
            <div className="text-base font-semibold">{formatNumber(totalCurrent)}</div>
          </div>
          {hasCompareDate && (
            <>
              <div>
                <div className="text-xs text-muted-foreground">{compareLabel}</div>
                <div className="text-base font-semibold">{formatNumber(totalCompare)}</div>
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
                  {formatNumber(totalDiff)}
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
        <Column {...chartConfig} />
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
            <span className="size-2 rounded-sm bg-[#1677ff]" />
            {currentLabel}
          </button>
        </div>
      )}

      {hasCompareDate && chartData.some((item) => item.percent !== undefined) && (
        <div className="mt-1 shrink-0 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-muted-foreground dark:border-white/8 dark:bg-white/4">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {chartData
              .filter((item) => item.percent !== undefined)
              .map((item) => (
                <span key={item.room}>
                  P{item.room}:{" "}
                  <span
                    className={
                      item.diff > 0
                        ? "text-green-600 dark:text-green-400"
                        : item.diff < 0
                          ? "text-red-600"
                          : ""
                    }
                  >
                    {item.diff > 0 ? "+" : ""}
                    {formatNumber(item.diff)} ({item.percent! > 0 ? "+" : ""}
                    {item.percent!.toFixed(1)}%)
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default RoomScreeningChart;
