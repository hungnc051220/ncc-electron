"use client";

import { useReportRevenueByFilm } from "@renderer/hooks/reports/useReportRevenueByFilm";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import { buildPriceColumns } from "./priceColumns";
import TabRevenue from "./TabRevenue";
import TabSummary, { SummaryRow } from "./TabSummary";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  manufacturerId?: number;
  filmId?: number;
  dateRange: [string, string];
}
export type SummaryGroup = {
  off: Row[];
  on: Row[];
};

export type Row = {
  key: string;
  filmName: string;
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
};

const RevenueByFilm = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    dateRange: [dayjs().startOf("day").format(), dayjs().endOf("day").format()]
  });

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").toISOString();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").toISOString();
    }

    return filtered;
  }, [filterValues]);

  const { data, isFetching } = useReportRevenueByFilm(params);

  const allPrices = Array.from(
    new Set(
      data?.revenuesByFilm.flatMap((f) =>
        f.planScreens.flatMap((p) => p.prices.map((x) => x.price))
      ) as number[]
    )
  ).sort((a, b) => b - a);

  const tableData: Row[] = [];
  data?.revenuesByFilm.forEach((film) => {
    const sortedScreens = [...film.planScreens].sort((a, b) => {
      if (a.projectDate !== b.projectDate) {
        return a.projectDate.localeCompare(b.projectDate);
      }
      return new Date(a.projectTime).getTime() - new Date(b.projectTime).getTime();
    });

    const byDate = sortedScreens.reduce<Record<string, typeof sortedScreens>>((acc, cur) => {
      (acc[cur.projectDate] ||= []).push(cur);
      return acc;
    }, {});

    const totalFilmRows = sortedScreens.length;
    let isFirstFilmRow = true;

    Object.entries(byDate).forEach(([date, screensOfDate]) => {
      const off = screensOfDate.filter((s) => !s.isOnline);
      const on = screensOfDate.filter((s) => s.isOnline);

      const totalDateRows = screensOfDate.length;
      let isFirstDateRow = true;

      const pushBlock = (screens: typeof screensOfDate, isOnline: boolean) => {
        screens.forEach((p, idx) => {
          const pricesMap: Record<number, number> = {};
          p.prices.forEach((pr) => {
            pricesMap[pr.price] = pr.totalQuantity;
          });

          tableData.push({
            key: `${film.filmId}-${p.planScreenId}-${isOnline}`,
            filmName: film.filmName,
            projectDate: date,
            projectTime: p.projectTime,
            roomName: p.roomName,
            isOnline,
            pricesMap,

            filmRowSpan: isFirstFilmRow ? totalFilmRows : 0,
            dateRowSpan: isFirstDateRow ? totalDateRows : 0,
            onlineRowSpan: idx === 0 ? screens.length : 0,

            totalInvitationQuantity: p.totalInvitationQuantity,
            totalContractQuantity: p.totalContractQuantity,
            totalQuantity: p.totalQuantity,
            totalSale: p.totalSale,
            saleVnPayQr: p.saleVnPayQr,
            saleVietQr: p.saleVietQr,
            actualSale: p.actualSale
          });

          isFirstFilmRow = false;
          isFirstDateRow = false;
        });
      };

      pushBlock(off, false);
      pushBlock(on, true);
    });
  });

  const summaryByDate = tableData.reduce<Record<string, SummaryGroup>>((acc, row) => {
    if (!acc[row.projectDate]) {
      acc[row.projectDate] = { off: [], on: [] };
    }
    row.isOnline ? acc[row.projectDate].on.push(row) : acc[row.projectDate].off.push(row);
    return acc;
  }, {});

  const filmColumn = {
    title: "Phim",
    dataIndex: "filmName",
    fixed: "left" as const,
    width: 260,
    onCell: (row: Row) => ({
      rowSpan: row.filmRowSpan
    })
  };

  const columns: ColumnsType<Row> = [
    filmColumn,
    {
      title: "Nội dung chi tiết",
      children: [
        {
          title: "Ngày",
          key: "projectDate",
          dataIndex: "projectDate",
          width: 110,
          render: (value: string) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY"),
          onCell: (row: Row) => ({ rowSpan: row.dateRowSpan })
        },
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
          render: (value: boolean) => (value ? "On" : "Off"),
          onCell: (row: Row) => ({ rowSpan: row.onlineRowSpan })
        }
      ],
      fixed: "left"
    },
    {
      title: "Loại giá vé (Đơn vị tính: 1.000 đồng)",
      children: buildPriceColumns<Row>(allPrices as number[])
    },
    {
      title: "Tổng",
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
      title: "Thành tiền",
      key: "totalSale",
      dataIndex: "totalSale",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150
    },
    {
      title: "Tiền VNPayQR",
      key: "saleVnPayQr",
      dataIndex: "saleVnPayQr",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150
    },
    {
      title: "Tiền VietQR",
      key: "saleVietQr",
      dataIndex: "saleVietQr",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150
    },
    {
      title: "Thực nộp",
      key: "actualSale",
      dataIndex: "actualSale",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150
    }
  ];

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      children: <TabRevenue tableData={tableData} columns={columns} isFetching={isFetching} />
    },
    {
      key: "2",
      label: "Tổng hợp",
      children: (
        <TabSummary
          summaryByDate={summaryByDate}
          isFetching={isFetching}
          priceColumns={buildPriceColumns<SummaryRow>(allPrices as number[])}
        />
      )
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  return (
    <div className="pb-6">
      <Tabs
        items={items}
        defaultActiveKey="1"
        type="card"
        size="small"
        tabBarExtraContent={
          <div className="flex justify-end mb-2 gap-3">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            <ExportRevenueExcelButton
              tableData={tableData}
              allPrices={allPrices as number[]}
              summaryByDate={summaryByDate}
              fromDate={filterValues.dateRange[0]!}
              toDate={filterValues.dateRange[1]!}
              employeeName={filterValues?.userName}
            />
          </div>
        }
      />
    </div>
  );
};

export default RevenueByFilm;
