import { useReportQuarterly } from "@renderer/hooks/reports/useReportQuarterly";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { MonthlyReportRoomProps, RoomReport } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo } from "react";
import { QuarterlyReportFilterValues } from "../../types";
import { formatQuarterLabel } from "../../utils";
import ExportRevenueExcelButton from "./ExportExcel";
import RoomRevenueChart from "./RoomRevenueChart";
import TabRevenue from "./TabRevenue";

export interface TimeTreeRow {
  key: string;
  label: string;

  totalV?: number;
  totalT?: number;
  totalTickets?: number;
  totalRevenue?: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;

  children?: TimeTreeRow[];
}

interface Tab3Props {
  filterValues: QuarterlyReportFilterValues;
}

const Tab3 = ({ filterValues }: Tab3Props) => {
  const hasFromDate = !!filterValues.fromDate;
  const hasCompareDate = !!filterValues.compareDate;

  const params = useMemo(() => {
    const payload = {
      year: filterValues.fromDate ? dayjs(filterValues.fromDate).year() : 0,
      quarter: filterValues.fromDate ? dayjs(filterValues.fromDate).quarter() : 0,
      reportType: "ROOM"
    };
    return payload;
  }, [filterValues.fromDate]);

  const compareParams = useMemo(() => {
    const payload = {
      year: filterValues.compareDate ? dayjs(filterValues.compareDate).year() : 0,
      quarter: filterValues.compareDate ? dayjs(filterValues.compareDate).quarter() : 0,
      reportType: "ROOM"
    };
    return payload;
  }, [filterValues.compareDate]);

  const { data, isFetching } = useReportQuarterly(params, hasFromDate);
  const { data: compareData, isFetching: isCompareFetching } = useReportQuarterly(
    compareParams,
    hasFromDate && hasCompareDate
  );
  const formatData = (hasFromDate ? data : undefined) as MonthlyReportRoomProps | undefined;
  const compareFormatData = (hasCompareDate ? compareData : undefined) as
    | MonthlyReportRoomProps
    | undefined;

  function collectAllTimes(data: RoomReport[]) {
    const set = new Set<string>();

    data.forEach((r) =>
      r.projectDates.forEach((d) => d.projectTimes.forEach((t) => set.add(t.projectTime)))
    );

    return Array.from(set).sort(); // ["10:30","14:00",...]
  }

  function mapToFullTimeTree(data: RoomReport[], allTimes: string[]): TimeTreeRow[] {
    return data.map((room) => {
      const roomRow: TimeTreeRow = {
        key: `room-${room.roomName}`,
        label: `Phòng ${room.roomName}`,
        totalV: 0,
        totalT: 0,
        totalTickets: 0,
        totalRevenue: 0,
        children: []
      };

      allTimes.forEach((t) => {
        roomRow[`${t}_V`] = 0;
        roomRow[`${t}_T`] = 0;
        roomRow[`${t}_C`] = 0;
        roomRow[`${t}_R`] = 0;
      });

      room.projectDates.forEach((d) => {
        const dateRow: TimeTreeRow = {
          key: `room-${room.roomName}-${d.projectDate}`,
          label: d.projectDate,
          totalV: 0,
          totalT: 0,
          totalTickets: 0,
          totalRevenue: 0,
          children: []
        };

        const onlineRow: TimeTreeRow = {
          key: `${dateRow.key}-online`,
          label: "Online",
          totalV: 0,
          totalT: 0,
          totalTickets: 0,
          totalRevenue: 0
        };

        const offlineRow: TimeTreeRow = {
          key: `${dateRow.key}-offline`,
          label: "Offline",
          totalV: 0,
          totalT: 0,
          totalTickets: 0,
          totalRevenue: 0
        };

        // init all time columns
        allTimes.forEach((t) => {
          dateRow[`${t}_V`] = 0;
          dateRow[`${t}_T`] = 0;
          dateRow[`${t}_C`] = 0;
          dateRow[`${t}_R`] = 0;

          onlineRow[`${t}_V`] = 0;
          onlineRow[`${t}_T`] = 0;
          onlineRow[`${t}_C`] = 0;
          onlineRow[`${t}_R`] = 0;

          offlineRow[`${t}_V`] = 0;
          offlineRow[`${t}_T`] = 0;
          offlineRow[`${t}_C`] = 0;
          offlineRow[`${t}_R`] = 0;
        });

        d.projectTimes.forEach((t) => {
          t.details.forEach((det) => {
            const target = det.isOnline ? onlineRow : offlineRow;

            // ---- channel row ----
            target[`${t.projectTime}_V`] += det.quantityV;
            target[`${t.projectTime}_T`] += det.quantityT;
            target[`${t.projectTime}_C`] += det.conQuantity;
            target[`${t.projectTime}_R`] += det.orderTotal;

            // ---- date row (sum online + offline) ----
            dateRow[`${t.projectTime}_V`] += det.quantityV;
            dateRow[`${t.projectTime}_T`] += det.quantityT;
            dateRow[`${t.projectTime}_C`] += det.conQuantity;
            dateRow[`${t.projectTime}_R`] += det.orderTotal;

            // ---- totals ----
            target.totalV! += det.quantityV;
            target.totalT! += det.quantityT;
            target.totalTickets! += det.conQuantity;
            target.totalRevenue! += det.orderTotal;

            dateRow.totalV! += det.quantityV;
            dateRow.totalT! += det.quantityT;
            dateRow.totalTickets! += det.conQuantity;
            dateRow.totalRevenue! += det.orderTotal;
          });
        });

        // ===== SUM DATE → ROOM =====

        allTimes.forEach((t) => {
          roomRow[`${t}_V`] += dateRow[`${t}_V`] || 0;
          roomRow[`${t}_T`] += dateRow[`${t}_T`] || 0;
          roomRow[`${t}_C`] += dateRow[`${t}_C`] || 0;
          roomRow[`${t}_R`] += dateRow[`${t}_R`] || 0;
        });

        roomRow.totalV! += dateRow.totalV || 0;
        roomRow.totalT! += dateRow.totalT || 0;
        roomRow.totalTickets! += dateRow.totalTickets || 0;
        roomRow.totalRevenue! += dateRow.totalRevenue || 0;

        dateRow.children!.push(onlineRow, offlineRow);
        roomRow.children!.push(dateRow);
      });

      return roomRow;
    });
  }

  function buildColumns(): ColumnsType<TimeTreeRow> {
    return [
      {
        title: "Phòng / Ngày / Kênh",
        dataIndex: "label",
        fixed: "left",
        width: 200,
        render: (v: string) => {
          // nếu là ngày YYYY-MM-DD → format
          if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
            return dayjs(v).format("DD/MM/YYYY");
          }

          return <div className="whitespace-pre-wrap">{v}</div>;
        }
      },
      // {
      //   title: "Suất chiếu",
      //   children: allTimes.map((t) => ({
      //     title: t,
      //     children: [
      //       {
      //         title: "Vé V",
      //         dataIndex: `${t}_V`,
      //         align: "right" as const,
      //         width: 80,
      //         render: (v) => (typeof v === "number" && v !== 0 ? formatNumber(v) : "")
      //       },
      //       {
      //         title: "Vé T",
      //         dataIndex: `${t}_T`,
      //         align: "right" as const,
      //         width: 80,
      //         render: (v) => (typeof v === "number" && v !== 0 ? formatNumber(v) : "")
      //       },
      //       {
      //         title: "Tổng vé",
      //         dataIndex: `${t}_C`,
      //         align: "right" as const,
      //         width: 90,
      //         render: (v) => (typeof v === "number" && v !== 0 ? formatNumber(v) : "")
      //       },
      //       {
      //         title: "Doanh thu",
      //         dataIndex: `${t}_R`,
      //         align: "right" as const,
      //         width: 120,
      //         render: (v) => (typeof v === "number" && v !== 0 ? formatMoney(v) : "")
      //       }
      //     ]
      //   }))
      // },
      {
        title: "Tổng",
        children: [
          {
            title: "Vé V",
            dataIndex: "totalV",
            align: "right",
            width: 80,
            render: (v) => (typeof v === "number" && v !== 0 ? formatNumber(v) : "")
          },
          {
            title: "Vé T",
            dataIndex: "totalT",
            align: "right",
            width: 80,
            render: (v) => (typeof v === "number" && v !== 0 ? formatNumber(v) : "")
          },
          {
            title: "Tổng vé",
            dataIndex: "totalTickets",
            align: "right",
            width: 90,
            render: (v) => (typeof v === "number" && v !== 0 ? formatNumber(v) : "")
          },
          {
            title: "Doanh thu",
            dataIndex: "totalRevenue",
            align: "right",
            width: 130,
            render: (v) => (typeof v === "number" && v !== 0 ? formatMoney(v) : "")
          }
        ],
        fixed: "right"
      }
    ];
  }

  const sumRoomTotals = (row?: TimeTreeRow) => ({
    totalV: row?.totalV || 0,
    totalT: row?.totalT || 0,
    totalTickets: row?.totalTickets || 0,
    totalRevenue: row?.totalRevenue || 0
  });

  const buildComparisonTreeData = (
    currentTree: TimeTreeRow[],
    compareTree: TimeTreeRow[]
  ): TimeTreeRow[] => {
    const roomLabels = Array.from(
      new Set([...currentTree.map((item) => item.label), ...compareTree.map((item) => item.label)])
    );

    return roomLabels.map((label, index) => {
      const currentRoom = currentTree.find((item) => item.label === label);
      const compareRoom = compareTree.find((item) => item.label === label);
      const currentTotals = sumRoomTotals(currentRoom);
      const compareTotals = sumRoomTotals(compareRoom);

      const totalVDiff = currentTotals.totalV - compareTotals.totalV;
      const totalTDiff = currentTotals.totalT - compareTotals.totalT;
      const totalTicketsDiff = currentTotals.totalTickets - compareTotals.totalTickets;
      const totalRevenueDiff = currentTotals.totalRevenue - compareTotals.totalRevenue;

      return {
        key: `room-comparison-${index}`,
        label,
        currentTotalV: currentTotals.totalV,
        compareTotalV: compareTotals.totalV,
        totalVDiff,
        totalVPercent: compareTotals.totalV ? (totalVDiff / compareTotals.totalV) * 100 : undefined,
        currentTotalT: currentTotals.totalT,
        compareTotalT: compareTotals.totalT,
        totalTDiff,
        totalTPercent: compareTotals.totalT ? (totalTDiff / compareTotals.totalT) * 100 : undefined,
        currentTotalTickets: currentTotals.totalTickets,
        compareTotalTickets: compareTotals.totalTickets,
        totalTicketsDiff,
        totalTicketsPercent: compareTotals.totalTickets
          ? (totalTicketsDiff / compareTotals.totalTickets) * 100
          : undefined,
        currentTotalRevenue: currentTotals.totalRevenue,
        compareTotalRevenue: compareTotals.totalRevenue,
        totalRevenueDiff,
        totalRevenuePercent: compareTotals.totalRevenue
          ? (totalRevenueDiff / compareTotals.totalRevenue) * 100
          : undefined
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

    return <span className={className}>{`${value > 0 ? "+" : ""}${formatter(value)}`}</span>;
  };

  const renderPercent = (value?: number) => {
    if (typeof value !== "number") {
      return "";
    }

    const className = value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600";

    return <span className={className}>{`${value > 0 ? "+" : ""}${value.toFixed(1)}%`}</span>;
  };

  const buildMetricComparisonColumns = (
    title: string,
    currentKey: string,
    compareKey: string,
    diffKey: string,
    percentKey: string,
    currentLabel: string,
    compareLabel: string,
    formatter = renderPlainNumber,
    diffFormatter = formatNumber
  ): ColumnsType<TimeTreeRow>[number] => ({
    title,
    children: [
      {
        title: currentLabel,
        dataIndex: currentKey,
        align: "right",
        width: 120,
        render: formatter
      },
      {
        title: compareLabel,
        dataIndex: compareKey,
        align: "right",
        width: 120,
        render: formatter
      },
      {
        title: "+/-",
        dataIndex: diffKey,
        align: "right",
        width: 120,
        render: (value) => renderDiffNumber(value, diffFormatter)
      },
      {
        title: "%",
        dataIndex: percentKey,
        align: "right",
        width: 100,
        render: renderPercent
      }
    ]
  });

  const buildComparisonColumns = (
    currentLabel: string,
    compareLabel: string
  ): ColumnsType<TimeTreeRow> => [
    {
      title: "Phòng",
      dataIndex: "label",
      fixed: "left",
      width: 200,
      render: (value: string) => <div className="whitespace-pre-wrap">{value}</div>
    },
    buildMetricComparisonColumns(
      "Vé V",
      "currentTotalV",
      "compareTotalV",
      "totalVDiff",
      "totalVPercent",
      currentLabel,
      compareLabel
    ),
    buildMetricComparisonColumns(
      "Vé T",
      "currentTotalT",
      "compareTotalT",
      "totalTDiff",
      "totalTPercent",
      currentLabel,
      compareLabel
    ),
    buildMetricComparisonColumns(
      "Tổng vé",
      "currentTotalTickets",
      "compareTotalTickets",
      "totalTicketsDiff",
      "totalTicketsPercent",
      currentLabel,
      compareLabel
    ),
    buildMetricComparisonColumns(
      "Doanh thu",
      "currentTotalRevenue",
      "compareTotalRevenue",
      "totalRevenueDiff",
      "totalRevenuePercent",
      currentLabel,
      compareLabel,
      renderPlainMoney,
      formatMoney
    )
  ];

  const allTimes = useMemo(() => collectAllTimes(formatData?.data || []), [formatData]);
  const compareTimes = useMemo(
    () => collectAllTimes(compareFormatData?.data || []),
    [compareFormatData]
  );
  const exportTimes = useMemo(
    () => Array.from(new Set([...allTimes, ...compareTimes])).sort(),
    [allTimes, compareTimes]
  );

  const currentTreeData = useMemo(
    () => mapToFullTimeTree(formatData?.data || [], allTimes),
    [formatData, allTimes]
  );

  const compareTreeData = useMemo(
    () => mapToFullTimeTree(compareFormatData?.data || [], compareTimes),
    [compareFormatData, compareTimes]
  );

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
        : buildColumns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasCompareDate, filterValues.fromDate, filterValues.compareDate]
  );

  const items: TabsProps["items"] = [
    {
      key: "chart",
      label: "Biểu đồ",
      forceRender: true,
      children: hasFromDate ? (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <RoomRevenueChart
            currentData={currentTreeData}
            compareData={compareTreeData}
            filterValues={filterValues}
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
      <Tabs
        items={items}
        defaultActiveKey="chart"
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
        tabBarExtraContent={
          <div className="mb-2 flex justify-end gap-3">
            {filterValues.fromDate && (
              <ExportRevenueExcelButton
                treeData={treeData}
                allTimes={hasCompareDate ? exportTimes : allTimes}
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

export default Tab3;
