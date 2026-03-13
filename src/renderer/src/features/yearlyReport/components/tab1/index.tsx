import { useReportYearly } from "@renderer/hooks/reports/useReportYearly";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { YearlyReportFilmDetail, YearlyReportManufacturerDetail } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";
import { getQuarterDetail, normalizeYearlyDetailData, QUARTERS } from "../yearlyReport.utils";

export interface ValuesProps {
  fromDate: string;
}

export interface TreeRow {
  key: string;
  name: string;
  isSummary?: boolean;
  children?: TreeRow[];
  [key: string]: string | number | boolean | TreeRow[] | undefined;
}

const quarterTitleMap: Record<(typeof QUARTERS)[number], string> = {
  1: "Quý I",
  2: "Quý II",
  3: "Quý III",
  4: "Quý IV"
};

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
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    fromDate: dayjs().startOf("year").format()
  });

  const params = useMemo(
    () => ({
      year: dayjs(filterValues.fromDate).year(),
      reportType: "PLAN" as const
    }),
    [filterValues.fromDate]
  );

  const { data, isFetching } = useReportYearly(params);

  const treeData = useMemo(
    () =>
      normalizeYearlyDetailData(data).map((item, index) =>
        buildManufacturerRow(item, `m-${index}`)
      ),
    [data]
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
      ...QUARTERS.map((quarter) => ({
        title: quarterTitleMap[quarter],
        children: [
          {
            title: "Buổi chiếu",
            dataIndex: `q${quarter}Screenings`,
            key: `q${quarter}Screenings`,
            align: "right" as const,
            width: 110,
            render: (value: number | undefined) => renderValue(value)
          },
          {
            title: "Khán giả",
            dataIndex: `q${quarter}Tickets`,
            key: `q${quarter}Tickets`,
            align: "right" as const,
            width: 110,
            render: (value: number | undefined) => renderValue(value)
          },
          {
            title: "Doanh thu",
            dataIndex: `q${quarter}Revenue`,
            key: `q${quarter}Revenue`,
            align: "right" as const,
            width: 140,
            render: (value: number | undefined) => renderValue(value, true)
          }
        ]
      })),
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
      children: <TabRevenue tableData={treeData} columns={columns} isFetching={isFetching} />
    }
  ];

  return (
    <div className="pb-6">
      <Tabs
        items={items}
        defaultActiveKey="1"
        type="card"
        size="small"
        tabBarExtraContent={
          <div className="mb-2 flex justify-end gap-3">
            <Filter filterValues={filterValues} onSearch={setFilterValues} />
            <ExportRevenueExcelButton treeData={treeData} year={params.year} />
          </div>
        }
      />
    </div>
  );
};

export default Tab1;
