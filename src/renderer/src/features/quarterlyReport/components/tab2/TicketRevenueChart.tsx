import type { ChartData, ChartOptions } from "chart.js";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { useThemeStore } from "@renderer/store/theme.store";
import { Spin, theme as antdTheme } from "antd";
import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import { QuarterlyReportFilterValues } from "../../types";
import { formatQuarterLabel } from "../../utils";
import { TreeRow } from ".";

interface TicketRevenueChartProps {
  currentData: TreeRow[];
  compareData: TreeRow[];
  filterValues: QuarterlyReportFilterValues;
  isReady: boolean;
}

interface ManufacturerChartData {
  manufacturerName: string;
  currentRevenue: number;
  compareRevenue: number;
  currentTickets: number;
  compareTickets: number;
  revenueDiff: number;
  revenuePercent?: number;
  ticketDiff: number;
  ticketPercent?: number;
}

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
  filterValues,
  isReady
}: TicketRevenueChartProps) => {
  const hasCompareDate = !!filterValues.compareDate;
  const isDark = useThemeStore((state) => state.theme === "dark");
  const { token } = antdTheme.useToken();

  const currentLabel = filterValues.fromDate ? formatQuarterLabel(filterValues.fromDate) : "";
  const compareLabel = filterValues.compareDate ? formatQuarterLabel(filterValues.compareDate) : "";

  const chartData = useMemo<ManufacturerChartData[]>(() => {
    if (!isReady) {
      return [];
    }

    const manufacturerNames = Array.from(
      new Set([
        ...currentData.map((item) => item.name || ""),
        ...compareData.map((item) => item.name || "")
      ])
    ).filter(Boolean);

    return manufacturerNames.map((manufacturerName) => {
      const current = getManufacturerTotals(
        currentData.find((item) => item.name === manufacturerName)
      );
      const compare = hasCompareDate
        ? getManufacturerTotals(compareData.find((item) => item.name === manufacturerName))
        : { tickets: 0, revenue: 0 };
      const revenueDiff = current.revenue - compare.revenue;
      const ticketDiff = current.tickets - compare.tickets;

      return {
        manufacturerName,
        currentRevenue: current.revenue,
        compareRevenue: compare.revenue,
        currentTickets: current.tickets,
        compareTickets: compare.tickets,
        revenueDiff,
        revenuePercent: compare.revenue ? (revenueDiff / compare.revenue) * 100 : undefined,
        ticketDiff,
        ticketPercent: compare.tickets ? (ticketDiff / compare.tickets) * 100 : undefined
      };
    });
  }, [compareData, currentData, hasCompareDate, isReady]);

  const totalCurrentRevenue = chartData.reduce((sum, item) => sum + item.currentRevenue, 0);
  const totalCompareRevenue = chartData.reduce((sum, item) => sum + item.compareRevenue, 0);
  const totalRevenueDiff = totalCurrentRevenue - totalCompareRevenue;
  const totalCurrentTickets = chartData.reduce((sum, item) => sum + item.currentTickets, 0);
  const totalCompareTickets = chartData.reduce((sum, item) => sum + item.compareTickets, 0);
  const totalTicketDiff = totalCurrentTickets - totalCompareTickets;

  const textColor = token.colorText;
  const mutedTextColor = token.colorTextSecondary;
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const borderColor = token.colorBorderSecondary;

  const data = useMemo<ChartData<"bar" | "line">>(() => {
    const labels = chartData.map((item) => item.manufacturerName);
    const datasets: ChartData<"bar" | "line">["datasets"] = [];

    if (hasCompareDate) {
      datasets.push(
        {
          type: "bar",
          label: `${compareLabel} - Doanh thu`,
          data: chartData.map((item) => item.compareRevenue),
          yAxisID: "revenue",
          backgroundColor: "#738095",
          borderColor: "#738095",
          borderRadius: 4,
          barPercentage: 0.55,
          categoryPercentage: 0.64,
          order: 2
        },
        {
          type: "line",
          label: `${compareLabel} - Tổng vé`,
          data: chartData.map((item) => item.compareTickets),
          yAxisID: "tickets",
          borderColor: "#64748b",
          backgroundColor: "#64748b",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.42,
          order: 1
        }
      );
    }

    datasets.push(
      {
        type: "bar",
        label: `${currentLabel} - Doanh thu`,
        data: chartData.map((item) => item.currentRevenue),
        yAxisID: "revenue",
        backgroundColor: "#3b82f6",
        borderColor: "#3b82f6",
        borderRadius: 4,
        barPercentage: 0.55,
        categoryPercentage: 0.64,
        order: 2
      },
      {
        type: "line",
        label: `${currentLabel} - Tổng vé`,
        data: chartData.map((item) => item.currentTickets),
        yAxisID: "tickets",
        borderColor: "#2563ff",
        backgroundColor: "#2563ff",
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 4,
        tension: 0.42,
        order: 1
      }
    );

    return { labels, datasets };
  }, [chartData, compareLabel, currentLabel, hasCompareDate]);

  const options = useMemo<ChartOptions<"bar" | "line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          align: "center",
          labels: {
            boxHeight: 8,
            boxWidth: 18,
            color: mutedTextColor,
            padding: 16,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.98)",
          bodyColor: textColor,
          borderColor,
          borderWidth: 1,
          titleColor: textColor,
          padding: 10,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || "";
              const value = Number(context.parsed.y || 0);

              if (context.dataset.yAxisID === "revenue") {
                return `${label}: ${formatMoney(value)}`;
              }

              return `${label}: ${formatNumber(value)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          border: {
            color: borderColor
          },
          ticks: {
            color: mutedTextColor,
            maxRotation: 0,
            minRotation: 0
          }
        },
        revenue: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          grid: {
            color: gridColor,
            drawTicks: false
          },
          border: {
            color: borderColor
          },
          title: {
            display: true,
            align: "start",
            color: textColor,
            font: {
              size: 12,
              weight: 500
            },
            padding: {
              bottom: 8
            },
            text: "Doanh thu"
          },
          ticks: {
            color: mutedTextColor,
            callback: (value) => formatCompactMoney(Number(value))
          }
        },
        tickets: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: {
            drawOnChartArea: false,
            drawTicks: false
          },
          border: {
            color: borderColor
          },
          title: {
            display: true,
            align: "end",
            color: textColor,
            font: {
              size: 12,
              weight: 500
            },
            padding: {
              bottom: 8
            },
            text: "Tổng vé"
          },
          ticks: {
            color: mutedTextColor,
            callback: (value) => formatNumber(Number(value))
          }
        }
      }
    }),
    [borderColor, gridColor, isDark, mutedTextColor, textColor]
  );

  if (!filterValues.fromDate) {
    return null;
  }

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

        {isReady && chartData.length > 0 && (
          <div className="flex flex-wrap items-start justify-end gap-4 text-right">
            <div>
              <div className="text-xs text-muted-foreground">{currentLabel} - Doanh thu</div>
              <div className="text-base font-semibold">
                {formatCompactMoney(totalCurrentRevenue)}
              </div>
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
        )}
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-slate-100 bg-slate-50/40 px-2 pb-1 pt-2 dark:border-white/8 dark:bg-black/10 [&_.chartjs-tooltip]:text-slate-900">
        {isReady && chartData.length > 0 ? (
          <Chart data={data} options={options} type="bar" />
        ) : (
          <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            {!isReady && <Spin size="large" />}
            <div>{isReady ? "Không có dữ liệu" : "Đang tải dữ liệu..."}</div>
          </div>
        )}
      </div>

      {hasCompareDate && chartData.some((item) => item.revenuePercent !== undefined) && (
        <div className="mt-1 shrink-0 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-muted-foreground dark:border-white/8 dark:bg-white/4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2 xl:grid-cols-4">
            {chartData
              .filter((item) => item.revenuePercent !== undefined)
              .map((item) => (
                <div key={item.manufacturerName} className="min-w-0 truncate">
                  <span className="text-slate-700 dark:text-slate-200">
                    {item.manufacturerName}:{" "}
                  </span>
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
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default TicketRevenueChart;
