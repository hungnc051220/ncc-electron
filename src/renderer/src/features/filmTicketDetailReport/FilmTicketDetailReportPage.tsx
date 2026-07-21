import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import type { ReportRevenueByFilmDto } from "@renderer/api/reportsApi";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import {
  getActualRemittance,
  getRevenueColumnMode,
  getTotalTicketAndContract
} from "@renderer/features/staffRevenueReport/components/revenueByFilm";
import type {
  Row,
  SummaryGroup
} from "@renderer/features/staffRevenueReport/components/revenueByFilm";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import TabRevenue from "@renderer/features/staffRevenueReport/components/revenueByFilm/TabRevenue";
import TabSummary from "@renderer/features/staffRevenueReport/components/revenueByFilm/TabSummary";
import { useReportRevenueByFilm } from "@renderer/hooks/reports/useReportRevenueByFilm";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import type { TabsProps } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import FilmTicketChart from "./components/FilmTicketChart";
import Filter from "./components/Filter";

export interface FilterValues {
  manufacturerId?: number;
  manufacturerName?: string;
  filmId?: number;
  filmName?: string;
  dateRange?: [string, string];
}

const getDefaultFilterValues = (): FilterValues => ({
  dateRange: [dayjs().startOf("day").format(), dayjs().endOf("day").format()]
});

const FilmTicketDetailReportPage = () => {
  const [filterValues, setFilterValues] = useState<FilterValues>(() => getDefaultFilterValues());

  const params = useMemo(() => {
    const filtered = filterEmptyValues({
      manufacturerId: filterValues.manufacturerId,
      filmId: filterValues.filmId,
      dateType: 2
    }) as ReportRevenueByFilmDto;

    if (filterValues.dateRange?.length === 2) {
      filtered.fromDate = dayjs(filterValues.dateRange[0]).startOf("day").format();
      filtered.toDate = dayjs(filterValues.dateRange[1]).endOf("day").format();
    }

    return filtered;
  }, [filterValues]);

  const hasRequiredFilter = !!filterValues.filmId && filterValues.dateRange?.length === 2;
  const { data, isFetching, refetch } = useReportRevenueByFilm(params, hasRequiredFilter);
  const reportData = hasRequiredFilter ? data : undefined;

  const tableData = useMemo<Row[]>(
    () =>
      reportData?.revenuesByFilm.map((film) => {
        const sortedScreens = [...film.planScreens].sort((a, b) => {
          if (a.projectDate !== b.projectDate) {
            return a.projectDate.localeCompare(b.projectDate);
          }
          if (a.projectTime !== b.projectTime) {
            return new Date(a.projectTime).getTime() - new Date(b.projectTime).getTime();
          }
          return Number(a.isOnline) - Number(b.isOnline);
        });

        const children = sortedScreens.map((p) => {
          const pricesMap: Record<number, number> = {};
          p.prices.forEach((pr) => {
            pricesMap[pr.price] = pr.totalQuantity;
          });

          const crmDiscount = p.crmDiscount ?? {};
          const internalDiscount = p.internalDiscount ?? {};

          return {
            key: `${film.filmId}-${p.planScreenId}-${p.isOnline}`,
            filmName: film.filmName,
            projectDate: p.projectDate,
            projectTime: p.projectTime,
            roomName: p.roomName,
            isOnline: p.isOnline,
            pricesMap,
            totalInvitationQuantity: p.totalInvitationQuantity,
            totalContractQuantity: p.totalContractQuantity,
            totalQuantity: p.totalQuantity,
            totalSale: p.totalSale,
            saleVnPayQr: p.saleVnPayQr,
            saleVietQr: p.saleVietQr,
            actualSale: p.actualSale || 0,
            discountOffline: crmDiscount.discountOffline ?? p.discountOffline ?? 0,
            discountOnline: crmDiscount.discountOnline ?? p.discountOnline ?? 0,
            discountPartner: crmDiscount.discountPartner ?? p.discountPartner ?? 0,
            discountTotal: crmDiscount.discountTotal ?? p.discountTotal ?? 0,
            internalDiscountTotal: internalDiscount.discountTotal ?? 0
          };
        });

        const pricesMap = children.reduce<Record<number, number>>((acc, row) => {
          Object.entries(row.pricesMap).forEach(([price, quantity]) => {
            const numericPrice = Number(price);
            acc[numericPrice] = (acc[numericPrice] ?? 0) + quantity;
          });
          return acc;
        }, {});

        return {
          key: `film-${film.filmId}`,
          filmName: film.filmName,
          isSummary: true,
          projectDate: "",
          projectTime: "",
          roomName: "",
          isOnline: false,
          pricesMap,
          totalInvitationQuantity: film.totalInvitationQuantity,
          totalContractQuantity: film.totalContractQuantity,
          totalQuantity: film.totalQuantity,
          totalSale: film.totalSale,
          saleVnPayQr: film.saleVnPayQr,
          saleVietQr: film.saleVietQr,
          actualSale: film.actualSale || 0,
          discountOffline: children.reduce((sum, row) => sum + row.discountOffline, 0),
          discountOnline: children.reduce((sum, row) => sum + row.discountOnline, 0),
          discountPartner: children.reduce((sum, row) => sum + row.discountPartner, 0),
          discountTotal: children.reduce((sum, row) => sum + row.discountTotal, 0),
          internalDiscountTotal: children.reduce((sum, row) => sum + row.internalDiscountTotal, 0),
          children
        };
      }) || [],
    [reportData?.revenuesByFilm]
  );

  const detailRows = useMemo(() => tableData.flatMap((row) => row.children || []), [tableData]);
  const columnMode = getRevenueColumnMode(filterValues);

  const summaryByDate = useMemo(
    () =>
      detailRows.reduce<Record<string, SummaryGroup>>((acc, row) => {
        const projectDate = row.projectDate;

        if (!acc[projectDate]) {
          acc[projectDate] = { off: [], on: [] };
        }
        row.isOnline ? acc[projectDate].on.push(row) : acc[projectDate].off.push(row);
        return acc;
      }, {}),
    [detailRows]
  );

  const columns = useMemo<ColumnsType<Row>>(() => {
    const filmColumn = {
      title: "Phim / Ngày",
      dataIndex: "filmName",
      fixed: "left" as const,
      width: 260,
      render: (_: unknown, row: Row) =>
        row.isSummary ? (
          <strong>{row.filmName}</strong>
        ) : (
          dayjs(row.projectDate).format("DD/MM/YYYY")
        )
    };

    return [
      filmColumn,
      {
        title: "Nội dung chi tiết",
        children: [
          {
            title: "Giờ",
            key: "projectTime",
            dataIndex: "projectTime",
            width: 80
          },
          {
            title: "Phòng",
            key: "roomName",
            dataIndex: "roomName",
            width: 60
          },
          {
            title: "Loại",
            key: "isOnline",
            dataIndex: "isOnline",
            width: 60,
            render: (value: boolean, row: Row) => (row.isSummary ? "" : value ? "On" : "Off")
          }
        ],
        fixed: "left"
      },
      {
        title: "Tổng vé",
        key: "totalQuantity",
        dataIndex: "totalQuantity",
        align: "right",
        render: (value: number) => formatNumber(value)
      },
      {
        title: "Giấy mời",
        key: "totalInvitationQuantity",
        dataIndex: "totalInvitationQuantity",
        render: (value: number) => formatNumber(value),
        align: "right"
      },
      {
        title: "Hợp đồng",
        key: "totalContractQuantity",
        dataIndex: "totalContractQuantity",
        render: (value: number) => formatNumber(value),
        align: "right"
      },
      {
        title: "Vé bán + HĐ",
        key: "totalTicketAndContract",
        align: "right",
        render: (_: number, row: Row) => formatNumber(getTotalTicketAndContract(row))
      },
      {
        title: "Tổng doanh thu",
        key: "actualSale",
        dataIndex: "actualSale",
        render: (value: number) => formatMoney(value),
        align: "right",
        width: 150
      },
      ...(columnMode === "manufacturer"
        ? []
        : [
            {
              title: "Khuyến mại",
              key: "discountTotal",
              dataIndex: "discountTotal",
              width: 150,
              align: "right" as const,
              render: (value: number) => formatMoney(value)
            },
            {
              title: "Giảm giá",
              key: "internalDiscountTotal",
              dataIndex: "internalDiscountTotal",
              width: 110,
              align: "right" as const,
              render: (value: number) => formatMoney(value)
            },
            ...(columnMode === "user"
              ? [
                  {
                    title: "VNPayQR",
                    key: "saleVnPayQr",
                    dataIndex: "saleVnPayQr",
                    width: 140,
                    align: "right" as const,
                    render: (value: number) => formatMoney(value)
                  },
                  {
                    title: "VietQR",
                    key: "saleVietQr",
                    dataIndex: "saleVietQr",
                    width: 140,
                    align: "right" as const,
                    render: (value: number) => formatMoney(value)
                  },
                  {
                    title: "Thực nộp",
                    key: "actualRemittance",
                    width: 160,
                    align: "right" as const,
                    render: (_: number, row: Row) => formatMoney(getActualRemittance(row))
                  }
                ]
              : [
                  {
                    title: "Tổng doanh thu sau KM",
                    key: "totalRevenueAfterDiscount",
                    width: 180,
                    align: "right" as const,
                    render: (_: number, row: Row) => formatMoney(row.actualSale - row.discountTotal)
                  }
                ])
          ])
    ];
  }, [columnMode]);

  const items: TabsProps["items"] = [
    {
      key: "chart",
      label: "Biểu đồ",
      forceRender: true,
      children: hasRequiredFilter ? (
        <div className="flex h-full min-h-0 flex-col">
          <FilmTicketChart data={data} filmName={filterValues.filmName} isFetching={isFetching} />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn phim cụ thể để xem biểu đồ" />
      )
    },
    {
      key: "detail",
      label: "Chi tiết",
      forceRender: true,
      children: hasRequiredFilter ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue tableData={tableData} columns={columns} isFetching={isFetching} />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn phim cụ thể để xem báo cáo" />
      )
    },
    {
      key: "summary",
      label: "Tổng hợp",
      forceRender: true,
      children: hasRequiredFilter ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabSummary
            summaryByDate={summaryByDate}
            isFetching={isFetching}
            totalRevenue={reportData?.totalRevenue}
            totalRevenueOnline={reportData?.totalRevenueOnline}
            totalRevenueOffline={reportData?.totalRevenueOffline}
            columnMode={columnMode}
          />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn phim cụ thể để xem báo cáo" />
      )
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader left={<AppBreadcrumb />} />

      <FullHeightTabs
        defaultActiveKey="chart"
        type="card"
        items={items}
        tabBarExtraContent={
          <div className="mb-1 flex items-center justify-end gap-2">
            <Filter filterValues={filterValues} onSearch={setFilterValues} />
            <RefreshButton
              disabled={!hasRequiredFilter}
              loading={isFetching}
              onRefresh={() => refetch()}
            />
          </div>
        }
      />
    </div>
  );
};

export default FilmTicketDetailReportPage;
