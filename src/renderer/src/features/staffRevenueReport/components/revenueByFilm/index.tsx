import { useReportRevenueByFilm } from "@renderer/hooks/reports/useReportRevenueByFilm";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import DateRangeRequiredEmptyState from "../DateRangeRequiredEmptyState";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";
import TabSummary from "./TabSummary";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  manufacturerId?: number;
  manufacturerName?: string;
  filmId?: number;
  dateRange?: [string, string];
}
export type SummaryGroup = {
  off: Row[];
  on: Row[];
};

export type Row = {
  key: string;
  filmName: string;
  isSummary?: boolean;
  projectDate: string;
  projectTime: string;
  isOnline: boolean;
  pricesMap: Record<number, number>; // price -> quantity
  roomName: string;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
  filmRowSpan?: number;
  dateRowSpan?: number;
  onlineRowSpan?: number;
  discountOffline: number;
  discountOnline: number;
  discountPartner: number;
  discountTotal: number;
  internalDiscountTotal: number;
  children?: Row[];
};

export type RevenueColumnMode = "default" | "user" | "manufacturer";

export const getRevenueColumnMode = (filterValues: ValuesProps): RevenueColumnMode => {
  if (filterValues.manufacturerId) {
    return "manufacturer";
  }

  if (filterValues.userId) {
    return "user";
  }

  return "default";
};

export const getActualRemittance = (
  row: Pick<Row, "actualSale" | "discountTotal" | "saleVietQr" | "saleVnPayQr">
) => row.actualSale - row.discountTotal - row.saleVietQr - row.saleVnPayQr;

export const getTotalTicketAndContract = (
  row: Pick<Row, "totalQuantity" | "totalContractQuantity">
) => row.totalQuantity + row.totalContractQuantity;

const RevenueByFilm = ({ dateType }: { dateType: number }) => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    filtered.dateType = dateType;

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").format();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").format();
    }

    return filtered;
  }, [filterValues, dateType]);

  const hasDateRange = filterValues.dateRange?.length === 2;
  const { data, isFetching } = useReportRevenueByFilm(params, hasDateRange);
  const reportData = hasDateRange ? data : undefined;

  const allPrices = Array.from(
    new Set(
      reportData?.revenuesByFilm.flatMap((f) =>
        f.planScreens.flatMap((p) => p.prices.map((x) => x.price))
      ) as number[]
    )
  ).sort((a, b) => b - a);

  const tableData: Row[] =
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
    }) || [];

  const detailRows = tableData.flatMap((row) => row.children || []);
  const columnMode = getRevenueColumnMode(filterValues);

  const summaryByDate = detailRows.reduce<Record<string, SummaryGroup>>((acc, row) => {
    const projectDate = row.projectDate;

    if (!acc[projectDate]) {
      acc[projectDate] = { off: [], on: [] };
    }
    row.isOnline ? acc[projectDate].on.push(row) : acc[projectDate].off.push(row);
    return acc;
  }, {});

  const filmColumn = {
    title: "Phim / Ngày",
    dataIndex: "filmName",
    fixed: "left" as const,
    width: 260,
    render: (_: unknown, row: Row) =>
      row.isSummary ? <strong>{row.filmName}</strong> : dayjs(row.projectDate).format("DD/MM/YYYY")
  };

  const columns: ColumnsType<Row> = [
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

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      forceRender: true,
      children: hasDateRange ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue tableData={tableData} columns={columns} isFetching={isFetching} />
        </div>
      ) : (
        <DateRangeRequiredEmptyState />
      )
    },
    {
      key: "2",
      label: "Tổng hợp",
      forceRender: true,
      children: hasDateRange ? (
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
        <DateRangeRequiredEmptyState />
      )
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(filterEmptyValues(values as Record<string, unknown>) as ValuesProps);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Tabs
        items={items}
        defaultActiveKey="1"
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
        tabBarExtraContent={
          <div className="flex justify-end gap-3 mr-2">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            {filterValues.dateRange?.length === 2 && (
              <ExportRevenueExcelButton
                tableData={detailRows}
                allPrices={allPrices as number[]}
                summaryByDate={summaryByDate}
                totalPlanCount={reportData?.totalRevenue?.totalPlanCount}
                fromDate={filterValues.dateRange[0]}
                toDate={filterValues.dateRange[1]}
                dateType={dateType}
                employeeName={filterValues?.userName}
                manufacturerName={filterValues?.manufacturerName}
                columnMode={columnMode}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default RevenueByFilm;
