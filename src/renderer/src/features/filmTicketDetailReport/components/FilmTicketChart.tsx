import type { ChartData, ChartOptions } from "chart.js";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { useThemeStore } from "@renderer/store/theme.store";
import type { ReportRevenueFilmByStaffProps } from "@shared/types";
import { Empty, Spin, theme as antdTheme } from "antd";
import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";

interface FilmTicketChartProps {
  data?: ReportRevenueFilmByStaffProps;
  filmName?: string;
  isFetching: boolean;
}

type TicketBreakdown = {
  soldTickets: number;
  invitationTickets: number;
  contractTickets: number;
  totalTickets: number;
};

const ticketLabels = ["Vé bán", "Giấy mời", "Vé hợp đồng"];
const revenueLabels = ["Online", "Offline"];
const ticketColors = ["#1677ff", "#16a34a", "#f59e0b"];
const revenueColors = ["#1677ff", "#16a34a"];

const buildTicketBreakdown = (
  revenue?: {
    totalQuantity?: number;
    totalInvitationQuantity?: number;
    totalContractQuantity?: number;
  } | null
): TicketBreakdown => {
  const soldTickets = revenue?.totalQuantity || 0;
  const invitationTickets = revenue?.totalInvitationQuantity || 0;
  const contractTickets = revenue?.totalContractQuantity || 0;

  return {
    soldTickets,
    invitationTickets,
    contractTickets,
    totalTickets: soldTickets + invitationTickets + contractTickets
  };
};

const FilmTicketChart = ({ data, filmName, isFetching }: FilmTicketChartProps) => {
  const isDark = useThemeStore((state) => state.theme === "dark");
  const { token } = antdTheme.useToken();

  const totalRevenue = data?.totalRevenue;
  const totalBreakdown = buildTicketBreakdown(totalRevenue);
  const { totalTickets } = totalBreakdown;
  const totalAmount = totalRevenue?.actualSale || 0;
  const onlineAmount = data?.totalRevenueOnline?.actualSale || 0;
  const offlineAmount = data?.totalRevenueOffline?.actualSale || 0;

  const hasData = totalTickets > 0;
  const borderColor = isDark ? token.colorBgContainer : "#ffffff";
  const textColor = token.colorText;
  const legendTextColor = isDark ? token.colorText : "#334155";

  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: "62%",
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            boxHeight: 10,
            boxWidth: 18,
            color: legendTextColor,
            padding: 18,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.98)",
          bodyColor: textColor,
          borderColor: token.colorBorderSecondary,
          borderWidth: 1,
          titleColor: textColor,
          padding: 10,
          callbacks: {
            label: (context) => {
              const value = Number(context.parsed || 0);
              const label = context.label || "";
              const datasetLabel = context.dataset.label || "";

              return datasetLabel === "Doanh thu"
                ? `${label}: ${formatMoney(value)}`
                : `${label}: ${formatNumber(value)} vé`;
            }
          }
        }
      }
    }),
    [isDark, legendTextColor, textColor, token.colorBorderSecondary]
  );

  const createTicketData = (breakdown: TicketBreakdown): ChartData<"doughnut"> => ({
    labels: ticketLabels,
    datasets: [
      {
        label: "Tổng vé",
        data: [breakdown.soldTickets, breakdown.invitationTickets, breakdown.contractTickets],
        backgroundColor: ticketColors,
        borderColor,
        borderWidth: 2,
        hoverOffset: 8
      }
    ]
  });

  const revenueData: ChartData<"doughnut"> = {
    labels: revenueLabels,
    datasets: [
      {
        label: "Doanh thu",
        data: [onlineAmount, offlineAmount],
        backgroundColor: revenueColors,
        borderColor,
        borderWidth: 2,
        hoverOffset: 8
      }
    ]
  };

  const ticketData = createTicketData(totalBreakdown);

  const renderChartCard = (
    title: string,
    chartData: ChartData<"doughnut">,
    totalLabel: string,
    totalValue: string
  ) => (
    <div className="flex min-h-120 flex-col rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm dark:border-white/10 dark:bg-app-bg-container dark:text-slate-100 dark:shadow-none">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{totalLabel}</div>
          <div className="text-base font-semibold">{totalValue}</div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        <div className="relative h-80 w-full max-w-80 sm:h-96 sm:max-w-96 2xl:h-105 2xl:max-w-105">
          <Doughnut data={chartData} options={options} />
        </div>
      </div>
    </div>
  );

  if (isFetching) {
    return (
      <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spin size="large" />
        <div>Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center">
        <Empty description="Không có dữ liệu" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto">
      <section className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-app-bg-container">
          <div className="text-xs text-muted-foreground">Phim</div>
          <div className="mt-1 truncate text-base font-semibold">{filmName || "-"}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-app-bg-container">
          <div className="text-xs text-muted-foreground">Tổng số vé</div>
          <div className="mt-1 text-xl font-semibold">{formatNumber(totalTickets)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-app-bg-container">
          <div className="text-xs text-muted-foreground">Tổng doanh thu</div>
          <div className="mt-1 text-xl font-semibold">{formatMoney(totalAmount)}</div>
        </div>
      </section>

      <section className="grid min-h-120 flex-1 grid-cols-1 gap-3 xl:grid-cols-2">
        {renderChartCard("Tổng số vé", ticketData, "Tổng vé", formatNumber(totalTickets))}
        {renderChartCard(
          "Doanh thu Online / Offline",
          revenueData,
          "Tổng doanh thu",
          formatMoney(totalAmount)
        )}
      </section>
    </div>
  );
};

export default FilmTicketChart;
