import { useReportYearly } from "@renderer/hooks/reports/useReportYearly";
import RefreshButton from "@renderer/components/RefreshButton";
import DateRangeRequiredEmptyState from "@renderer/features/staffRevenueReport/components/DateRangeRequiredEmptyState";
import { formatMoney } from "@renderer/lib/utils";
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

const renderMoney = (value: number | undefined) => {
  if (!value) return "";
  return formatMoney(value);
};

const buildFilmRow = (film: YearlyReportFilmDetail, key: string): TreeRow => {
  const row: TreeRow = {
    key,
    name: film.filmName,
    totalPartnerRevenue: film.totalPartnerRevenue || 0,
    totalRevenue: film.totalRevenue || 0
  };

  QUARTERS.forEach((quarter) => {
    const detail = getQuarterDetail(film.quarters, quarter);
    row[`q${quarter}PartnerRevenue`] = detail.partnerRevenue || 0;
    row[`q${quarter}Revenue`] = detail.totalRevenue || 0;
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
    totalPartnerRevenue: 0,
    totalRevenue: 0,
    children
  };

  QUARTERS.forEach((quarter) => {
    row[`q${quarter}PartnerRevenue`] = 0;
    row[`q${quarter}Revenue`] = 0;
  });

  children.forEach((child) => {
    row.totalPartnerRevenue =
      Number(row.totalPartnerRevenue || 0) + Number(child.totalPartnerRevenue || 0);
    row.totalRevenue = Number(row.totalRevenue || 0) + Number(child.totalRevenue || 0);

    QUARTERS.forEach((quarter) => {
      row[`q${quarter}PartnerRevenue`] =
        Number(row[`q${quarter}PartnerRevenue`] || 0) +
        Number(child[`q${quarter}PartnerRevenue`] || 0);
      row[`q${quarter}Revenue`] =
        Number(row[`q${quarter}Revenue`] || 0) + Number(child[`q${quarter}Revenue`] || 0);
    });
  });

  return row;
};

const Tab3 = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({});
  const hasFromDate = !!filterValues.fromDate;

  const params = useMemo(
    () => ({
      year: filterValues.fromDate ? dayjs(filterValues.fromDate).year() : 0,
      reportType: "REVENUE_PARTNER" as const
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
        title: "Đối tác / Phim",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 360
      },
      {
        title: "Cả năm",
        children: [
          {
            title: "DT đối tác",
            dataIndex: "totalPartnerRevenue",
            key: "totalPartnerRevenue",
            align: "right",
            width: 150,
            render: (value: number | undefined) => renderMoney(value)
          },
          {
            title: "Tổng doanh thu",
            dataIndex: "totalRevenue",
            key: "totalRevenue",
            align: "right",
            width: 150,
            render: (value: number | undefined) => renderMoney(value)
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

export default Tab3;
