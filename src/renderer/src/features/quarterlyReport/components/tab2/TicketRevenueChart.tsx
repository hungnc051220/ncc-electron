import { DualAxes, type DualAxesConfig } from "@ant-design/charts";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { useThemeStore } from "@renderer/store/theme.store";
import { theme as antdTheme } from "antd";
import { useEffect, useRef, useState } from "react";
import { QuarterlyReportFilterValues } from "../../types";
import { formatQuarterLabel } from "../../utils";
import { TreeRow } from ".";

interface TicketRevenueChartProps {
  currentData: TreeRow[];
  compareData: TreeRow[];
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

const getManufacturerTotals = (row?: TreeRow) => ({
  tickets: row?.totalTickets || 0,
  revenue: row?.totalRevenue || 0
});

const TicketRevenueChart = ({
  currentData,
  compareData,
  filterValues
}: TicketRevenueChartProps) => {
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

    const updateHeight = () => {
      setChartHeight(Math.max(1, Math.floor(container.clientHeight)));
    };

    updateHeight();

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
  const manufacturerNames = Array.from(
    new Set([
      ...currentData.map((item) => item.name || ""),
      ...compareData.map((item) => item.name || "")
    ])
  ).filter(Boolean);

  const chartData = manufacturerNames.map((manufacturerName) => {
    const current = getManufacturerTotals(
      currentData.find((item) => item.name === manufacturerName)
    );
    const compare = hasCompareDate
      ? getManufacturerTotals(compareData.find((item) => item.name === manufacturerName))
      : { tickets: 0, revenue: 0 };
    const revenueDiff = current.revenue - compare.revenue;
    const revenuePercent = compare.revenue ? (revenueDiff / compare.revenue) * 100 : undefined;
    const ticketDiff = current.tickets - compare.tickets;
    const ticketPercent = compare.tickets ? (ticketDiff / compare.tickets) * 100 : undefined;

    return {
      manufacturerName,
      currentRevenue: current.revenue,
      compareRevenue: compare.revenue,
      currentTickets: current.tickets,
      compareTickets: compare.tickets,
      revenueDiff,
      revenuePercent,
      ticketDiff,
      ticketPercent
    };
  });

  const totalCurrentRevenue = chartData.reduce((sum, item) => sum + item.currentRevenue, 0);
  const totalCompareRevenue = chartData.reduce((sum, item) => sum + item.compareRevenue, 0);
  const totalRevenueDiff = totalCurrentRevenue - totalCompareRevenue;
  const totalCurrentTickets = chartData.reduce((sum, item) => sum + item.currentTickets, 0);
  const totalCompareTickets = chartData.reduce((sum, item) => sum + item.compareTickets, 0);
  const totalTicketDiff = totalCurrentTickets - totalCompareTickets;

  const revenueSource = chartData
    .flatMap((item) =>
      hasCompareDate
        ? [
            {
              manufacturerName: item.manufacturerName,
              periodKey: "compare",
              period: compareLabel,
              revenue: item.compareRevenue
            },
            {
              manufacturerName: item.manufacturerName,
              periodKey: "current",
              period: currentLabel,
              revenue: item.currentRevenue
            }
          ]
        : [
            {
              manufacturerName: item.manufacturerName,
              periodKey: "current",
              period: currentLabel,
              revenue: item.currentRevenue
            }
          ]
    )
    .filter((item) => !hiddenPeriods.includes(item.periodKey as PeriodKey));

  const ticketSource = chartData
    .flatMap((item) =>
      hasCompareDate
        ? [
            {
              manufacturerName: item.manufacturerName,
              periodKey: "compare",
              period: compareLabel,
              tickets: item.compareTickets
            },
            {
              manufacturerName: item.manufacturerName,
              periodKey: "current",
              period: currentLabel,
              tickets: item.currentTickets
            }
          ]
        : [
            {
              manufacturerName: item.manufacturerName,
              periodKey: "current",
              period: currentLabel,
              tickets: item.currentTickets
            }
          ]
    )
    .filter((item) => !hiddenPeriods.includes(item.periodKey as PeriodKey));

  const chartConfig: DualAxesConfig = {
    xField: "manufacturerName",
    data: chartData,
    height: chartHeight,
    autoFit: true,
    theme: {
      type: isDark ? "dark" : "light",
      view: {
        viewFill: "transparent"
      }
    },
    axis: {
      x: {
        title: false
      },
      y: {
        title: "",
        titleFillOpacity: 0,
        titleFontSize: 0,
        titleSpacing: 0
      }
    },
    legend: false,
    children: [
      {
        type: "interval",
        data: revenueSource,
        xField: "manufacturerName",
        yField: "revenue",
        colorField: "period",
        transform: [{ type: "dodgeX" }],
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
            title: "",
            titleFillOpacity: 0,
            titleFontSize: 0,
            titleSpacing: 0,
            grid: true,
            gridLineStroke: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
            labelFill: token.colorTextSecondary,
            labelFormatter: (value: number) => formatCompactMoney(value)
          }
        },
        scale: {
          color: {
            range: hasCompareDate ? ["#94a3b8", "#16a34a"] : ["#16a34a"]
          }
        },
        style: {
          radiusTopLeft: 4,
          radiusTopRight: 4,
          maxWidth: hasCompareDate ? 26 : 40
        },
        tooltip: {
          title: (datum: { manufacturerName: string }) => datum.manufacturerName,
          items: [
            {
              field: "revenue",
              name: "Doanh thu",
              valueFormatter: (value: number) => formatMoney(value)
            }
          ]
        }
      },
      {
        type: "line",
        data: ticketSource,
        xField: "manufacturerName",
        yField: "tickets",
        colorField: "period",
        shapeField: "smooth",
        scale: {
          y: {
            independent: true,
            key: "tickets"
          },
          color: {
            range: hasCompareDate ? ["#64748b", "#1677ff"] : ["#1677ff"]
          }
        },
        axis: {
          y: {
            position: "right",
            title: "",
            titleFillOpacity: 0,
            titleFontSize: 0,
            titleSpacing: 0,
            grid: null,
            labelFill: token.colorTextSecondary,
            labelFormatter: (value: number) => formatNumber(value)
          }
        },
        style: {
          lineWidth: 2
        },
        point: {
          sizeField: 3,
          shapeField: "circle"
        },
        tooltip: {
          items: [
            {
              field: "tickets",
              name: "Tổng vé",
              valueFormatter: (value: number) => formatNumber(value)
            }
          ]
        }
      }
    ],
    padding: [32, 72, 54, 64]
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm dark:border-white/10 dark:bg-app-bg-container dark:text-slate-100 dark:shadow-none">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            {hasCompareDate ? "So sánh theo hãng phim" : "Thống kê theo hãng phim"}
          </div>
          <div className="text-xs text-muted-foreground">
            {hasCompareDate ? `${currentLabel} và ${compareLabel}` : currentLabel}
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-end gap-4 text-right">
          <div>
            <div className="text-xs text-muted-foreground">{currentLabel} - Doanh thu</div>
            <div className="text-base font-semibold">{formatCompactMoney(totalCurrentRevenue)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{currentLabel} - Tổng vé</div>
            <div className="text-base font-semibold">{formatNumber(totalCurrentTickets)}</div>
          </div>
          {hasCompareDate && (
            <>
              <div>
                <div className="text-xs text-muted-foreground">{compareLabel} - Doanh thu</div>
                <div className="text-base font-semibold">
                  {formatCompactMoney(totalCompareRevenue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{compareLabel} - Tổng vé</div>
                <div className="text-base font-semibold">{formatNumber(totalCompareTickets)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Chênh lệch DT</div>
                <div
                  className={`text-base font-semibold ${
                    totalRevenueDiff > 0
                      ? "text-green-600 dark:text-green-400"
                      : totalRevenueDiff < 0
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {totalRevenueDiff > 0 ? "+" : ""}
                  {formatCompactMoney(totalRevenueDiff)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Chênh lệch vé</div>
                <div
                  className={`text-base font-semibold ${
                    totalTicketDiff > 0
                      ? "text-green-600 dark:text-green-400"
                      : totalTicketDiff < 0
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {totalTicketDiff > 0 ? "+" : ""}
                  {formatNumber(totalTicketDiff)}
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
        <DualAxes key={chartHeight} {...chartConfig} />
      </div>

      <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="mr-2 inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[#16a34a]" />
          Doanh thu
        </span>
        <span className="mr-4 inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[#1677ff]" />
          Tổng vé
        </span>
        {hasCompareDate && (
          <>
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
              <span className="size-2 rounded-sm bg-[#16a34a]" />
              {currentLabel}
            </button>
          </>
        )}
      </div>

      {hasCompareDate && chartData.some((item) => item.revenuePercent !== undefined) && (
        <div className="mt-1 shrink-0 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-muted-foreground dark:border-white/8 dark:bg-white/4">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {chartData
              .filter((item) => item.revenuePercent !== undefined)
              .map((item) => (
                <span key={item.manufacturerName}>
                  {item.manufacturerName}:{" "}
                  <span
                    className={
                      item.revenueDiff > 0
                        ? "text-green-600 dark:text-green-400"
                        : item.revenueDiff < 0
                          ? "text-red-600"
                          : ""
                    }
                  >
                    DT {item.revenueDiff > 0 ? "+" : ""}
                    {formatCompactMoney(item.revenueDiff)} ({item.revenuePercent! > 0 ? "+" : ""}
                    {item.revenuePercent!.toFixed(1)}%)
                    {item.ticketPercent !== undefined && (
                      <>
                        {" / "}Vé {item.ticketDiff > 0 ? "+" : ""}
                        {formatNumber(item.ticketDiff)} ({item.ticketPercent > 0 ? "+" : ""}
                        {item.ticketPercent.toFixed(1)}%)
                      </>
                    )}
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default TicketRevenueChart;
