import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions
} from "chart.js";
import { formatNumber } from "@renderer/lib/utils";
import { useThemeStore } from "@renderer/store/theme.store";
import { Spin, theme as antdTheme } from "antd";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { QuarterlyReportFilterValues } from "../../types";
import { formatQuarterLabel } from "../../utils";
import { TreeRow } from ".";

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

interface RoomScreeningChartProps {
  data: TreeRow[];
  rooms: string[];
  filterValues: QuarterlyReportFilterValues;
  isReady: boolean;
}

interface RoomChartData {
  room: string;
  current: number;
  compare: number;
  diff: number;
  percent?: number;
}

const getRoomValue = (row: TreeRow, key: string) => Number(row[key] || 0);

const RoomScreeningChart = ({
  data: sourceData,
  rooms,
  filterValues,
  isReady
}: RoomScreeningChartProps) => {
  const hasCompareDate = !!filterValues.compareDate;
  const isDark = useThemeStore((state) => state.theme === "dark");
  const { token } = antdTheme.useToken();

  const currentLabel = filterValues.fromDate ? formatQuarterLabel(filterValues.fromDate) : "";
  const compareLabel = filterValues.compareDate ? formatQuarterLabel(filterValues.compareDate) : "";

  const chartData = useMemo<RoomChartData[]>(() => {
    if (!isReady) {
      return [];
    }

    return rooms.map((room) => {
      const current = sourceData.reduce(
        (sum, row) => sum + getRoomValue(row, hasCompareDate ? `P${room}_current` : `P${room}`),
        0
      );
      const compare = hasCompareDate
        ? sourceData.reduce((sum, row) => sum + getRoomValue(row, `P${room}_compare`), 0)
        : 0;
      const diff = current - compare;

      return {
        room,
        current,
        compare,
        diff,
        percent: compare ? (diff / compare) * 100 : undefined
      };
    });
  }, [hasCompareDate, isReady, rooms, sourceData]);

  const totalCurrent = chartData.reduce((sum, item) => sum + item.current, 0);
  const totalCompare = chartData.reduce((sum, item) => sum + item.compare, 0);
  const totalDiff = totalCurrent - totalCompare;

  const textColor = token.colorText;
  const mutedTextColor = token.colorTextSecondary;
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const borderColor = token.colorBorderSecondary;

  const chartJsData = useMemo<ChartData<"bar">>(() => {
    const labels = chartData.map((item) => `P${item.room}`);
    const datasets: ChartData<"bar">["datasets"] = [];

    if (hasCompareDate) {
      datasets.push({
        label: compareLabel,
        data: chartData.map((item) => item.compare),
        backgroundColor: "#94a3b8",
        borderColor: "#94a3b8",
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.68
      });
    }

    datasets.push({
      label: currentLabel,
      data: chartData.map((item) => item.current),
      backgroundColor: "#1677ff",
      borderColor: "#1677ff",
      borderRadius: 4,
      barPercentage: 0.6,
      categoryPercentage: 0.68
    });

    return { labels, datasets };
  }, [chartData, compareLabel, currentLabel, hasCompareDate]);

  const options = useMemo<ChartOptions<"bar">>(
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
            label: (context) =>
              `${context.dataset.label || ""}: ${formatNumber(Number(context.parsed.y || 0))}`
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
            color: mutedTextColor
          }
        },
        y: {
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
            text: "Số buổi chiếu"
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
            {hasCompareDate ? "So sánh số buổi chiếu theo phòng" : "Số buổi chiếu theo phòng"}
          </div>
          <div className="text-xs text-muted-foreground">
            {hasCompareDate ? `${currentLabel} và ${compareLabel}` : currentLabel}
          </div>
        </div>

        {isReady && chartData.length > 0 && (
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
        )}
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-slate-100 bg-slate-50/40 px-2 pb-1 pt-2 dark:border-white/8 dark:bg-black/10">
        {isReady && chartData.length > 0 ? (
          <Bar data={chartJsData} options={options} />
        ) : (
          <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            {!isReady && <Spin size="large" />}
            <div>{isReady ? "Không có dữ liệu" : "Đang tải dữ liệu..."}</div>
          </div>
        )}
      </div>

      {hasCompareDate && chartData.some((item) => item.percent !== undefined) && (
        <div className="mt-1 shrink-0 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-muted-foreground dark:border-white/8 dark:bg-white/4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2 xl:grid-cols-4">
            {chartData
              .filter((item) => item.percent !== undefined)
              .map((item) => (
                <div key={item.room} className="min-w-0 truncate">
                  <span className="text-slate-700 dark:text-slate-200">P{item.room}: </span>
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
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default RoomScreeningChart;
