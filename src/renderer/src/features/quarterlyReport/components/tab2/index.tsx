import { useReportQuarterly } from "@renderer/hooks/reports/useReportQuarterly";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { Manufacturer2, MonthlyReportTicketProps } from "@shared/types";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import type { TabsProps } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo } from "react";
import { QuarterlyReportFilterValues } from "../../types";
import { formatQuarterLabel } from "../../utils";
import ExportRevenueExcelButton from "./ExportExcel";
import TicketRevenueChart from "./TicketRevenueChart";
import TabRevenue from "./TabRevenue";

export interface TreeRow {
  key: string;
  name?: string;
  date?: string;
  time?: string;
  version?: string;
  totalTickets?: number;
  totalRevenue?: number;
  [priceKey: string]:
    | {
        tickets: number;
        revenue: number;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | any;

  children?: TreeRow[];
}

interface Tab2Props {
  filterValues: QuarterlyReportFilterValues;
}

const Tab2 = ({ filterValues }: Tab2Props) => {
  const hasFromDate = !!filterValues.fromDate;
  const hasCompareDate = !!filterValues.compareDate;

  const params = useMemo(() => {
    const payload = {
      year: filterValues.fromDate ? dayjs(filterValues.fromDate).year() : 0,
      quarter: filterValues.fromDate ? dayjs(filterValues.fromDate).quarter() : 0,
      reportType: "TICKET"
    };
    return payload;
  }, [filterValues.fromDate]);

  const compareParams = useMemo(() => {
    const payload = {
      year: filterValues.compareDate ? dayjs(filterValues.compareDate).year() : 0,
      quarter: filterValues.compareDate ? dayjs(filterValues.compareDate).quarter() : 0,
      reportType: "TICKET"
    };
    return payload;
  }, [filterValues.compareDate]);

  const { data, isFetching } = useReportQuarterly(params, hasFromDate);
  const { data: compareData, isFetching: isCompareFetching } = useReportQuarterly(
    compareParams,
    hasFromDate && hasCompareDate
  );
  const formatData = (hasFromDate ? data : undefined) as MonthlyReportTicketProps | undefined;
  const compareFormatData = (hasCompareDate ? compareData : undefined) as
    | MonthlyReportTicketProps
    | undefined;
  const isChartDataReady =
    hasFromDate &&
    !!formatData &&
    !isFetching &&
    (!hasCompareDate || (!!compareFormatData && !isCompareFetching));

  function collectAllPrices(data: Manufacturer2[]) {
    const set = new Set<number>();

    data.forEach((m) =>
      m.films.forEach((f) =>
        f.projects.forEach((p) =>
          p.versions.forEach((v) => v.prices.forEach((pr) => set.add(pr.unitPriceInclTax)))
        )
      )
    );

    return Array.from(set).sort((a, b) => a - b);
  }

  function mapApiToPivotTree(data: Manufacturer2[], allPrices: number[]): TreeRow[] {
    return data.map((m) => ({
      key: `m-${m.manufacturerId}`,
      name: m.manufacturerName,

      children: m.films.map((f) => ({
        key: `f-${f.filmId}`,
        name: f.filmName,

        children: f.projects.map((p, pi) => {
          const version = p.versions[0];

          const row: TreeRow = {
            key: `p-${f.filmId}-${pi}`,
            date: dayjs(p.projectDate).format("DD/MM/YYYY"),
            time: p.projectTime,
            version: version.versionCode,
            totalTickets: 0,
            totalRevenue: 0
          };

          // init online + offline per price
          allPrices.forEach((price) => {
            row[`price_${price}_online`] = { tickets: 0, revenue: 0 };
            row[`price_${price}_offline`] = { tickets: 0, revenue: 0 };
          });

          // fill data
          version.prices.forEach((pr) => {
            const key =
              `price_${pr.unitPriceInclTax}_${pr.isOnline ? "online" : "offline"}` as const;

            row[key].tickets += pr.totalTickets;
            row[key].revenue += pr.totalRevenue;

            row.totalTickets! += pr.totalTickets;
            row.totalRevenue! += pr.totalRevenue;
          });

          return row;
        })
      }))
    }));
  }

  const baseColumns: ColumnsType<TreeRow> = [
    {
      title: "Hãng phim / Phim",
      dataIndex: "name",
      width: 350,
      render: (v) => v && <div style={{ whiteSpace: "pre-wrap" }}>{v}</div>,
      fixed: "left"
    },
    {
      title: "Ngày",
      dataIndex: "date",
      width: 110,
      fixed: "left",
      align: "center"
    },
    {
      title: "Giờ",
      dataIndex: "time",
      width: 90,
      fixed: "left",
      align: "center"
    },
    {
      title: "Version",
      dataIndex: "version",
      width: 70,
      fixed: "left",
      align: "center"
    }
  ];

  // function buildPriceColumns(prices: number[]): ColumnsType<TreeRow> {
  //   return prices.map((price) => ({
  //     title: (price / 1000).toString(),
  //     children: [
  //       {
  //         title: "Online",
  //         children: [
  //           {
  //             title: "Số vé",
  //             align: "right",
  //             width: 100,
  //             render: (_, row) => row[`price_${price}_online`]?.tickets || ""
  //           },
  //           {
  //             title: "Thành tiền",
  //             align: "right",
  //             width: 100,
  //             render: (_, row) =>
  //               row[`price_${price}_online`]?.revenue
  //                 ? formatMoney(row[`price_${price}_online`]?.revenue)
  //                 : ""
  //           }
  //         ]
  //       },
  //       {
  //         title: "Offline",
  //         children: [
  //           {
  //             title: "Số vé",
  //             align: "right",
  //             width: 100,
  //             render: (_, row) => row[`price_${price}_offline`]?.tickets || ""
  //           },
  //           {
  //             title: "Thành tiền",
  //             align: "right",
  //             width: 100,
  //             render: (_, row) =>
  //               row[`price_${price}_offline`]?.revenue
  //                 ? formatMoney(row[`price_${price}_offline`]?.revenue)
  //                 : ""
  //           }
  //         ]
  //       }
  //     ]
  //   }));
  // }

  const totalColumns: ColumnsType<TreeRow> = [
    {
      title: "Tổng vé",
      dataIndex: "totalTickets",
      align: "right",
      width: 90,
      fixed: "right",
      render: (value: number) => (value ? formatNumber(value) : "")
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalRevenue",
      align: "right",
      width: 140,
      render: (v) => (typeof v === "number" ? formatMoney(v) : ""),
      fixed: "right"
    }
  ];

  function addRowTotal(target: TreeRow, source: TreeRow, allPrices: number[]) {
    allPrices.forEach((price) => {
      const onlineKey = `price_${price}_online`;
      const offlineKey = `price_${price}_offline`;

      target[onlineKey].tickets += source[onlineKey].tickets;
      target[onlineKey].revenue += source[onlineKey].revenue;

      target[offlineKey].tickets += source[offlineKey].tickets;
      target[offlineKey].revenue += source[offlineKey].revenue;
    });

    target.totalTickets! += source.totalTickets || 0;
    target.totalRevenue! += source.totalRevenue || 0;
  }

  function initPriceFields(row: TreeRow, allPrices: number[]) {
    row.totalTickets = 0;
    row.totalRevenue = 0;

    allPrices.forEach((price) => {
      row[`price_${price}_online`] = { tickets: 0, revenue: 0 };
      row[`price_${price}_offline`] = { tickets: 0, revenue: 0 };
    });
  }

  function calculateTreeTotals(tree: TreeRow[], allPrices: number[]) {
    tree.forEach((m) => {
      // init manufacturer total
      initPriceFields(m, allPrices);

      m.children?.forEach((f) => {
        initPriceFields(f, allPrices);

        f.children?.forEach((p) => {
          // cộng project → film
          addRowTotal(f, p, allPrices);
        });

        // cộng film → manufacturer
        addRowTotal(m, f, allPrices);
      });
    });
  }

  const sumTicketTotals = (row?: TreeRow) => ({
    tickets: row?.totalTickets || 0,
    revenue: row?.totalRevenue || 0
  });

  const buildComparisonTreeData = (currentTree: TreeRow[], compareTree: TreeRow[]): TreeRow[] => {
    const manufacturerNames = Array.from(
      new Set([
        ...currentTree.map((item) => item.name || ""),
        ...compareTree.map((item) => item.name || "")
      ])
    ).filter(Boolean);

    return manufacturerNames.map((manufacturerName, manufacturerIndex) => {
      const currentManufacturer = currentTree.find((item) => item.name === manufacturerName);
      const compareManufacturer = compareTree.find((item) => item.name === manufacturerName);
      const filmNames = Array.from(
        new Set([
          ...(currentManufacturer?.children?.map((item) => item.name || "") || []),
          ...(compareManufacturer?.children?.map((item) => item.name || "") || [])
        ])
      ).filter(Boolean);

      const children = filmNames.map((filmName, filmIndex) => {
        const currentFilm = currentManufacturer?.children?.find((item) => item.name === filmName);
        const compareFilm = compareManufacturer?.children?.find((item) => item.name === filmName);
        const currentTotals = sumTicketTotals(currentFilm);
        const compareTotals = sumTicketTotals(compareFilm);
        const ticketDiff = currentTotals.tickets - compareTotals.tickets;
        const revenueDiff = currentTotals.revenue - compareTotals.revenue;

        return {
          key: `m-${manufacturerIndex}-f-${filmIndex}`,
          name: filmName,
          currentTickets: currentTotals.tickets,
          compareTickets: compareTotals.tickets,
          ticketDiff,
          ticketPercent: compareTotals.tickets
            ? (ticketDiff / compareTotals.tickets) * 100
            : undefined,
          currentRevenue: currentTotals.revenue,
          compareRevenue: compareTotals.revenue,
          revenueDiff,
          revenuePercent: compareTotals.revenue
            ? (revenueDiff / compareTotals.revenue) * 100
            : undefined
        };
      });

      const currentTotals = sumTicketTotals(currentManufacturer);
      const compareTotals = sumTicketTotals(compareManufacturer);
      const ticketDiff = currentTotals.tickets - compareTotals.tickets;
      const revenueDiff = currentTotals.revenue - compareTotals.revenue;

      return {
        key: `m-${manufacturerIndex}`,
        name: manufacturerName,
        currentTickets: currentTotals.tickets,
        compareTickets: compareTotals.tickets,
        ticketDiff,
        ticketPercent: compareTotals.tickets
          ? (ticketDiff / compareTotals.tickets) * 100
          : undefined,
        currentRevenue: currentTotals.revenue,
        compareRevenue: compareTotals.revenue,
        revenueDiff,
        revenuePercent: compareTotals.revenue
          ? (revenueDiff / compareTotals.revenue) * 100
          : undefined,
        children
      };
    });
  };

  const renderPlainNumber = (value?: number) =>
    typeof value === "number" ? formatNumber(value) : "";

  const renderPlainMoney = (value?: number) =>
    typeof value === "number" ? formatMoney(value) : "";

  const renderDiffNumber = (value?: number, formatter = formatNumber) => {
    if (!value) {
      return "";
    }

    const className = value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600";
    const prefix = value > 0 ? "+" : "";

    return <span className={className}>{`${prefix}${formatter(value)}`}</span>;
  };

  const renderPercent = (value?: number) => {
    if (typeof value !== "number") {
      return "";
    }

    const className = value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600";

    return <span className={className}>{`${value > 0 ? "+" : ""}${value.toFixed(1)}%`}</span>;
  };

  const buildComparisonColumns = (
    currentLabel: string,
    compareLabel: string
  ): ColumnsType<TreeRow> => [
    {
      title: "Hãng phim / Phim",
      dataIndex: "name",
      width: 350,
      fixed: "left",
      render: (value) => value && <div style={{ whiteSpace: "pre-wrap" }}>{value}</div>
    },
    {
      title: "So sánh tổng vé",
      children: [
        {
          title: currentLabel,
          dataIndex: "currentTickets",
          align: "right",
          width: 120,
          render: renderPlainNumber
        },
        {
          title: compareLabel,
          dataIndex: "compareTickets",
          align: "right",
          width: 120,
          render: renderPlainNumber
        },
        {
          title: "+/-",
          dataIndex: "ticketDiff",
          align: "right",
          width: 100,
          render: (value) => renderDiffNumber(value)
        },
        {
          title: "%",
          dataIndex: "ticketPercent",
          align: "right",
          width: 100,
          render: renderPercent
        }
      ]
    },
    {
      title: "So sánh tổng tiền",
      children: [
        {
          title: currentLabel,
          dataIndex: "currentRevenue",
          align: "right",
          width: 140,
          render: renderPlainMoney
        },
        {
          title: compareLabel,
          dataIndex: "compareRevenue",
          align: "right",
          width: 140,
          render: renderPlainMoney
        },
        {
          title: "+/-",
          dataIndex: "revenueDiff",
          align: "right",
          width: 140,
          render: (value) => renderDiffNumber(value, formatMoney)
        },
        {
          title: "%",
          dataIndex: "revenuePercent",
          align: "right",
          width: 100,
          render: renderPercent
        }
      ]
    }
  ];

  const allPrices = useMemo(() => collectAllPrices(formatData?.data || []), [formatData]);
  const comparePrices = useMemo(
    () => collectAllPrices(compareFormatData?.data || []),
    [compareFormatData]
  );
  const exportPrices = useMemo(
    () => Array.from(new Set([...allPrices, ...comparePrices])).sort((a, b) => a - b),
    [allPrices, comparePrices]
  );

  const currentTreeData = useMemo(() => {
    const tree = mapApiToPivotTree(formatData?.data || [], allPrices);
    calculateTreeTotals(tree, allPrices);
    return tree;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, allPrices]);

  const compareTreeData = useMemo(() => {
    const tree = mapApiToPivotTree(compareFormatData?.data || [], comparePrices);
    calculateTreeTotals(tree, comparePrices);
    return tree;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareData, comparePrices]);

  const treeData = useMemo(
    () =>
      hasCompareDate ? buildComparisonTreeData(currentTreeData, compareTreeData) : currentTreeData,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentTreeData, compareTreeData, hasCompareDate]
  );

  const columns = useMemo(
    () =>
      hasCompareDate && filterValues.fromDate && filterValues.compareDate
        ? buildComparisonColumns(
            formatQuarterLabel(filterValues.fromDate),
            formatQuarterLabel(filterValues.compareDate)
          )
        : [
            ...baseColumns,
            // {
            //   title: "Loại giá vé (Đơn vị tính 1.000 đồng)",
            //   children: buildPriceColumns(allPrices)
            // },
            ...totalColumns
          ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allPrices, hasCompareDate, filterValues.fromDate, filterValues.compareDate]
  );

  const items: TabsProps["items"] = [
    {
      key: "chart",
      label: "Biểu đồ",
      forceRender: true,
      children: hasFromDate ? (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <TicketRevenueChart
            currentData={currentTreeData}
            compareData={compareTreeData}
            filterValues={filterValues}
            isReady={isChartDataReady}
          />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn quý để xem biểu đồ" />
      )
    },
    {
      key: "detail",
      label: "Chi tiết",
      forceRender: true,
      children: hasFromDate ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue
            tableData={treeData}
            columns={columns}
            isFetching={isFetching || isCompareFetching}
          />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn quý để xem báo cáo" />
      )
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <FullHeightTabs
        items={items}
        defaultActiveKey="chart"
        tabBarExtraContent={
          <div className="mb-2 flex justify-end gap-3">
            {filterValues.fromDate && (
              <ExportRevenueExcelButton
                treeData={treeData}
                allPrices={hasCompareDate ? exportPrices : allPrices}
                fromDate={filterValues.fromDate}
                compareDate={filterValues.compareDate}
                loading={isFetching || isCompareFetching}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default Tab2;
