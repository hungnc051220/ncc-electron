import { useReportYearly } from "@renderer/hooks/reports/useReportYearly";
import { formatMoney } from "@renderer/lib/utils";
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
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    fromDate: dayjs().startOf("year").format()
  });

  const params = useMemo(
    () => ({
      year: dayjs(filterValues.fromDate).year(),
      reportType: "REVENUE_PARTNER" as const
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
        title: "Đối tác / Phim",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 360
      },
      ...QUARTERS.map((quarter) => ({
        title: quarterTitleMap[quarter],
        children: [
          {
            title: "DT đối tác",
            dataIndex: `q${quarter}PartnerRevenue`,
            key: `q${quarter}PartnerRevenue`,
            align: "right" as const,
            width: 150,
            render: (value: number | undefined) => renderMoney(value)
          },
          {
            title: "Tổng doanh thu",
            dataIndex: `q${quarter}Revenue`,
            key: `q${quarter}Revenue`,
            align: "right" as const,
            width: 150,
            render: (value: number | undefined) => renderMoney(value)
          }
        ]
      })),
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

export default Tab3;
