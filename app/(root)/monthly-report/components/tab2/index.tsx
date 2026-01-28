"use client";

import { getMonthlyReport } from "@/data/loaders";
import {
  Film,
  Film2,
  Manufacturer,
  Manufacturer2,
  MonthlyReportTicketProps,
  Price,
} from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import Filter from "./filter";
import TabRevenue from "./tab-revenue";
import ExportRevenueExcelButton from "./export-excel";
import { formatMoney, formatNumber } from "@/lib/utils";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  manufacturerId?: number;
  filmId?: number;
  fromDate: string;
}

export interface TreeRow {
  key: string;

  name?: string;
  date?: string;
  time?: string;
  version?: string;

  totalTickets?: number;
  totalRevenue?: number;

  // dynamic
  [priceKey: string]:
    | {
        tickets: number;
        revenue: number;
      }
    | any;

  children?: TreeRow[];
}

const Tab2 = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    fromDate: dayjs().startOf("month").format(),
  });

  const { data, isFetching } = useQuery({
    queryKey: ["monthly-report-ticket", filterValues],
    queryFn: () => {
      return getMonthlyReport({ ...filterValues, reportType: "TICKET" }).then(
        (res) => res as MonthlyReportTicketProps,
      );
    },
    placeholderData: keepPreviousData,
  });

  function collectAllPrices(data: Manufacturer2[]) {
    const set = new Set<number>();

    data.forEach((m) =>
      m.films.forEach((f) =>
        f.projects.forEach((p) =>
          p.versions.forEach((v) =>
            v.prices.forEach((pr) => set.add(pr.unitPriceInclTax)),
          ),
        ),
      ),
    );

    return Array.from(set).sort((a, b) => a - b);
  }

  function sumPrices(prices: Price[]) {
    return prices.reduce(
      (s, p) => {
        s.tickets += p.totalTickets;
        s.revenue += p.totalRevenue;
        return s;
      },
      { tickets: 0, revenue: 0 },
    );
  }

  function sumFilm(film: Film2) {
    let tickets = 0;
    let revenue = 0;

    film.projects.forEach((p) =>
      p.versions.forEach((v) =>
        v.prices.forEach((pr) => {
          tickets += pr.totalTickets;
          revenue += pr.totalRevenue;
        }),
      ),
    );

    return { tickets, revenue };
  }

  const getAllPrices = (data: Manufacturer2[]) => {
    const set = new Set<string>();
    data.forEach((m) =>
      m.films.forEach((f) => f.projects.forEach((r) => set.add(r.roomName))),
    );
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  };

  const sumByRooms = (
    films: Film[],
    rooms: string[],
  ): Record<string, number> => {
    const result: Record<string, number> = {};

    rooms.forEach((r) => {
      result[`P${r}`] = 0;
    });

    films.forEach((f) => {
      f.rooms.forEach((r) => {
        const key = `P${r.roomName}`;
        result[key] += r.total;
      });
    });

    return result;
  };

  function mapApiToPivotTree(
    data: Manufacturer2[],
    allPrices: number[],
  ): TreeRow[] {
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
            totalRevenue: 0,
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
        }),
      })),
    }));
  }

  const baseColumns: ColumnsType<TreeRow> = [
    {
      title: "Tên / Phim",
      dataIndex: "name",
      width: 350,
      render: (v) => v && <div style={{ whiteSpace: "pre-wrap" }}>{v}</div>,
      fixed: "left",
    },
    {
      title: "Ngày",
      dataIndex: "date",
      width: 110,
    },
    { title: "Giờ", dataIndex: "time", width: 90 },
    { title: "Version", dataIndex: "version", width: 90 },
  ];

  function buildPriceColumns(prices: number[]): ColumnsType<TreeRow> {
    return prices.map((price) => ({
      title: (price / 1000).toString(),
      children: [
        {
          title: "Online",
          children: [
            {
              title: "Số vé",
              align: "right",
              width: 100,
              render: (_, row) => row[`price_${price}_online`]?.tickets || "",
            },
            {
              title: "Thành tiền",
              align: "right",
              width: 100,
              render: (_, row) =>
                row[`price_${price}_online`]?.revenue
                  ? formatMoney(row[`price_${price}_online`]?.revenue)
                  : "",
            },
          ],
        },
        {
          title: "Offline",
          children: [
            {
              title: "Số vé",
              align: "right",
              width: 100,
              render: (_, row) => row[`price_${price}_offline`]?.tickets || "",
            },
            {
              title: "Thành tiền",
              align: "right",
              width: 100,
              render: (_, row) =>
                row[`price_${price}_offline`]?.revenue
                  ? formatMoney(row[`price_${price}_offline`]?.revenue)
                  : "",
            },
          ],
        },
      ],
    }));
  }

  const totalColumns: ColumnsType<TreeRow> = [
    {
      title: "Tổng vé",
      dataIndex: "totalTickets",
      align: "right",
      width: 90,
      fixed: "right",
      render: (value: number) => (value ? formatNumber(value) : ""),
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalRevenue",
      align: "right",
      width: 140,
      render: (v) => (typeof v === "number" ? formatMoney(v) : ""),
      fixed: "right",
    },
  ];

  const allPrices = useMemo(() => collectAllPrices(data?.data || []), [data]);
  const treeData = useMemo(
    () => mapApiToPivotTree(data?.data || [], allPrices),
    [data, allPrices],
  );

  const columns = useMemo(
    () => [
      ...baseColumns,
      {
        title: "Loại giá vé (Đơn vị tính 1.000 đồng)",
        children: buildPriceColumns(allPrices),
      },
      ...totalColumns,
    ],
    [allPrices],
  );

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      children: (
        <TabRevenue
          tableData={treeData}
          columns={columns}
          isFetching={isFetching}
        />
      ),
    },
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
            {/* <ExportRevenueExcelButton
              treeData={dataSource}
              rooms={rooms}
              fromDate={filterValues.fromDate!}
            /> */}
          </div>
        }
      />
    </div>
  );
};

export default Tab2;
