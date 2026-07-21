import { useReportYearly } from "@renderer/hooks/reports/useReportYearly";
import RefreshButton from "@renderer/components/RefreshButton";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { YearlyReportFilmDetail, YearlyReportManufacturerDetail } from "@shared/types";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import type { TabsProps } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";
import { getQuarterDetail, normalizeYearlyDetailData, QUARTERS } from "../yearlyReport.utils";

export interface ValuesProps {
  fromDate?: string;
}

export interface TreeRow {
  key: string;
  name: string;
  isSummary?: boolean;
  children?: TreeRow[];
  [key: string]: string | number | boolean | TreeRow[] | undefined;
}

const renderValue = (value: number | undefined, isMoney = false) => {
  if (!value) return "";
  return isMoney ? formatMoney(value) : formatNumber(value);
};

const buildFilmRow = (film: YearlyReportFilmDetail, key: string): TreeRow => {
  const row: TreeRow = {
    key,
    name: film.filmName,
    totalScreenings: film.totalScreenings || 0,
    totalTicketsSold: film.totalTicketsSold || 0,
    totalRevenue: film.totalRevenue || 0
  };

  QUARTERS.forEach((quarter) => {
    const detail = getQuarterDetail(film.quarters, quarter);
    row[`q${quarter}Screenings`] = detail.screenings || 0;
    row[`q${quarter}Tickets`] = detail.tickets || 0;
    row[`q${quarter}Revenue`] = detail.revenue || 0;
  });

  return row;
};

const buildManufacturerRow = (
  manufacturer: YearlyReportManufacturerDetail,
  key: string
): TreeRow => {
  const children = manufacturer.films.map((film, index) => buildFilmRow(film, `${key}-f-${index}`));

  const row: TreeRow = {
    key,
    name: manufacturer.manufacturerName,
    isSummary: true,
    totalScreenings: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    children
  };

  QUARTERS.forEach((quarter) => {
    row[`q${quarter}Screenings`] = 0;
    row[`q${quarter}Tickets`] = 0;
    row[`q${quarter}Revenue`] = 0;
  });

  children.forEach((child) => {
    row.totalScreenings = Number(row.totalScreenings || 0) + Number(child.totalScreenings || 0);
    row.totalTicketsSold = Number(row.totalTicketsSold || 0) + Number(child.totalTicketsSold || 0);
    row.totalRevenue = Number(row.totalRevenue || 0) + Number(child.totalRevenue || 0);

    QUARTERS.forEach((quarter) => {
      row[`q${quarter}Screenings`] =
        Number(row[`q${quarter}Screenings`] || 0) + Number(child[`q${quarter}Screenings`] || 0);
      row[`q${quarter}Tickets`] =
        Number(row[`q${quarter}Tickets`] || 0) + Number(child[`q${quarter}Tickets`] || 0);
      row[`q${quarter}Revenue`] =
        Number(row[`q${quarter}Revenue`] || 0) + Number(child[`q${quarter}Revenue`] || 0);
    });
  });

  return row;
};

const Tab1 = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({});
  const hasFromDate = !!filterValues.fromDate;

  const params = useMemo(
    () => ({
      year: filterValues.fromDate ? dayjs(filterValues.fromDate).year() : 0,
      reportType: "PLAN" as const
    }),
    [filterValues.fromDate]
  );

  const { data, isFetching, refetch } = useReportYearly(params, hasFromDate);

  const treeData = useMemo(
    () =>
      normalizeYearlyDetailData(hasFromDate ? data : undefined).map((item, index) =>
        buildManufacturerRow(item, `m-${index}`)
      ),
    [data, hasFromDate]
  );

  const columns = useMemo<ColumnsType<TreeRow>>(
    () => [
      {
        title: "Hãng phim / Phim",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 360
      },
      {
        title: "Cả năm",
        children: [
          {
            title: "Buổi chiếu",
            dataIndex: "totalScreenings",
            key: "totalScreenings",
            align: "right",
            width: 110,
            render: (value: number | undefined) => renderValue(value)
          },
          {
            title: "Khán giả",
            dataIndex: "totalTicketsSold",
            key: "totalTicketsSold",
            align: "right",
            width: 110,
            render: (value: number | undefined) => renderValue(value)
          },
          {
            title: "Doanh thu",
            dataIndex: "totalRevenue",
            key: "totalRevenue",
            align: "right",
            width: 140,
            render: (value: number | undefined) => renderValue(value, true)
          }
        ],
        fixed: "right"
      }
    ],
    []
  );

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      forceRender: true,
      children: hasFromDate ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue tableData={treeData} columns={columns} isFetching={isFetching} />
        </div>
      ) : (
        <DateRangeRequiredEmptyState description="Vui lòng chọn năm để xem báo cáo" />
      )
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values.fromDate ? values : {});
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <FullHeightTabs
        items={items}
        defaultActiveKey="1"
        tabBarExtraContent={
          <div className="flex justify-end gap-3">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            <RefreshButton
              disabled={!hasFromDate}
              loading={isFetching}
              onRefresh={() => refetch()}
            />
            {filterValues.fromDate && (
              <ExportRevenueExcelButton treeData={treeData} year={params.year} />
            )}
          </div>
        }
      />
    </div>
  );
};

export default Tab1;
